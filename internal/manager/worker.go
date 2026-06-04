package manager

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"
)

// handshakeTimeout 是父进程等待 worker 子进程握手的上限。
const handshakeTimeout = 10 * time.Second

// handshake 是 worker 子进程握手行的解析结果。
type handshake struct {
	Addr string // 127.0.0.1:<port>
	User string
	Pass string
}

// parseHandshake 解析 "FRPS_WORKER_READY addr=.. user=.. pass=.." 一行。
// 非该前缀的行（含 frps 自身日志）一律拒绝。
func parseHandshake(line string) (handshake, bool) {
	line = strings.TrimSpace(line)
	const prefix = "FRPS_WORKER_READY "
	if !strings.HasPrefix(line, prefix) {
		return handshake{}, false
	}
	hs := handshake{}
	for _, kv := range strings.Fields(strings.TrimPrefix(line, prefix)) {
		k, v, ok := strings.Cut(kv, "=")
		if !ok {
			continue
		}
		switch k {
		case "addr":
			hs.Addr = v
		case "user":
			hs.User = v
		case "pass":
			hs.Pass = v
		}
	}
	if hs.Addr == "" {
		return handshake{}, false
	}
	return hs, true
}

// worker 监管一个 frps 子进程。
type worker struct {
	id      string
	cmd     *exec.Cmd
	hs      handshake
	mu      sync.Mutex
	stopped bool
}

// freeLoopbackPort 预分配一个空闲 loopback 端口（立即释放，交给 worker 绑定）。
// 必须非零：frps 在 WebServer.Port==0 时根本不起 webServer（见计划 R1）。
func freeLoopbackPort() (int, error) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}
	defer l.Close()
	return l.Addr().(*net.TCPAddr).Port, nil
}

// spawnWorker re-exec 当前二进制为 frps-worker，等待握手就绪。
//
// frps 把自身运行日志打到 stdout（实测，见计划 R9），握手行 FRPS_WORKER_READY
// 并非首行。故这里**逐行扫描** stdout：非握手行转发给 logSink，匹配到握手行后
// 上报并把剩余 stdout 全量转发给 logSink。stderr 直接接到 logSink。
func spawnWorker(ctx context.Context, id, selfExePath, cfgPath string, logSink io.Writer) (*worker, error) {
	port, err := freeLoopbackPort()
	if err != nil {
		return nil, fmt.Errorf("alloc loopback port: %w", err)
	}
	cmd := exec.CommandContext(ctx, selfExePath,
		"frps-worker", "--config", cfgPath, "--webport", fmt.Sprintf("%d", port))
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	cmd.Stderr = logSink
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("start worker: %w", err)
	}

	w := &worker{id: id, cmd: cmd}
	hsCh := make(chan handshake, 1)
	go func() {
		br := bufio.NewReader(stdout)
		for {
			line, rerr := br.ReadString('\n')
			if line != "" {
				if hs, ok := parseHandshake(line); ok {
					hsCh <- hs
					// 握手之后的所有 stdout 行都是 frps 日志，转发给日志槽。
					_, _ = io.Copy(logSink, br)
					return
				}
				// 握手前的 frps 日志行，照样转发。
				_, _ = io.WriteString(logSink, line)
			}
			if rerr != nil {
				close(hsCh) // EOF/错误前未等到握手
				return
			}
		}
	}()

	select {
	case hs, ok := <-hsCh:
		if !ok {
			_ = kill(cmd)
			return nil, errors.New("worker exited before handshake")
		}
		w.hs = hs
		return w, nil
	case <-time.After(handshakeTimeout):
		_ = kill(cmd)
		return nil, errors.New("worker handshake timeout")
	}
}

// stop 优雅终止子进程：优先平台信号（Unix SIGTERM），再 Wait 回收避免僵尸。
func (w *worker) stop() error {
	w.mu.Lock()
	if w.stopped {
		w.mu.Unlock()
		return nil
	}
	w.stopped = true
	w.mu.Unlock()
	if w.cmd.Process != nil {
		_ = signalTerminate(w.cmd.Process)
	}
	_ = w.cmd.Wait()
	return nil
}

// kill 硬杀子进程（握手失败/超时的兜底）。
func kill(cmd *exec.Cmd) error {
	if cmd.Process == nil {
		return nil
	}
	return cmd.Process.Kill()
}

// selfExe 返回当前可执行文件路径，用于 re-exec frps-worker。
func selfExe() (string, error) { return os.Executable() }
