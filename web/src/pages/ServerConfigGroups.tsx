// 服务端配置全字段分组表单。使用 Ant Design Collapse 把按 frps v0.69.1
// ServerConfig 分组的字段渲染为可视化表单。本组件必须放在 <Form> 内部，
// 否则 Form.Item 无法挂载到 form context。
//
// 字段拼写权威来源（v0.69.1）：
//   github.com/fatedier/frp/pkg/config/v1/server.go
//   github.com/fatedier/frp/pkg/config/v1/common.go

import { Collapse, Row, Col, Form, Input, InputNumber, Switch, Select, Alert, Button, Space, Typography, Tag } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import type { WebServerInfo } from '../api/types';

const { Text } = Typography;

interface Props {
  envelopeWebServer?: WebServerInfo;
  themeBorderColor: string;
}

/** 三态 *bool 指针的 Select 选项（未设 / 启用 / 禁用）。
 * 注：antd Select 对 boolean value 的渲染不稳，统一用字符串字面量，
 * 然后由 flattenServerConfig/buildServerConfigPayload 在两端做 string↔bool 映射。 */
const TRISTATE_UNSET = '';
const TRISTATE_TRUE = 'true';
const TRISTATE_FALSE = 'false';
const tristateOptions = [
  { value: TRISTATE_UNSET, label: '未设置（使用默认）' },
  { value: TRISTATE_TRUE, label: '启用 (true)' },
  { value: TRISTATE_FALSE, label: '禁用 (false)' },
];

const logLevelOptions = [
  { value: 'trace', label: 'trace (最详细)' },
  { value: 'debug', label: 'debug (调试)' },
  { value: 'info', label: 'info (常规信息)' },
  { value: 'warn', label: 'warn (警告)' },
  { value: 'error', label: 'error (错误)' },
];

const authMethodOptions = [
  { value: 'token', label: 'Token 认证' },
  { value: 'oidc', label: 'OIDC 认证' },
];

const ServerConfigGroups: React.FC<Props> = ({ envelopeWebServer, themeBorderColor }) => {
  return (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="实例备注名" name="name">
            <Input placeholder="例如: 杭州云服务器" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="启动策略"
            name="manualStart"
            valuePropName="checked"
            tooltip="开启「手动启动」后，守护进程重启不会自动拉起该实例。"
          >
            <Switch checkedChildren="手动启动" unCheckedChildren="随服务启动" />
          </Form.Item>
        </Col>
      </Row>

      <Collapse
        bordered
        defaultActiveKey={['basic', 'auth']}
        style={{ marginBottom: 16 }}
        items={[
          // ─── 1. 基础监听 ───
          {
            key: 'basic',
            label: <Space><Tag color="blue" bordered={false}>基础</Tag>监听地址 / 端口</Space>,
            children: (
              <>
                <Row gutter={16}>
                  <Col span={16}>
                    <Form.Item label="监听地址 (bindAddr)" name="bindAddr" tooltip="frps 主控制端口的监听地址，默认 0.0.0.0">
                      <Input placeholder="0.0.0.0" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="监听端口 (bindPort)" name="bindPort" tooltip="frpc 连过来用的主端口，默认 7000">
                      <InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="7000" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="代理出口地址 (proxyBindAddr)" name="proxyBindAddr" tooltip="frps 把流量转发出去时绑定的本机地址，默认与 bindAddr 相同">
                      <Input placeholder="留空则与 bindAddr 相同" />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="KCP 端口 (kcpBindPort)" name="kcpBindPort" tooltip="KCP 协议监听端口，0 表示禁用">
                      <InputNumber min={0} max={65535} style={{ width: '100%' }} placeholder="0=禁用" />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="QUIC 端口 (quicBindPort)" name="quicBindPort" tooltip="QUIC 协议监听端口，0 表示禁用">
                      <InputNumber min={0} max={65535} style={{ width: '100%' }} placeholder="0=禁用" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="TCPMux HTTP CONNECT 端口 (tcpmuxHTTPConnectPort)"
                      name="tcpmuxHTTPConnectPort"
                      tooltip="把多个 TCP 服务复用到一个端口的 HTTP CONNECT 端口，0 表示禁用"
                    >
                      <InputNumber min={0} max={65535} style={{ width: '100%' }} placeholder="0=禁用" />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      label="TCPMux 透传 (tcpmuxPassthrough)"
                      name="tcpmuxPassthrough"
                      valuePropName="checked"
                      tooltip="开启后 frps 不修改透传流量"
                    >
                      <Switch />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      label="向客户端返回详细错误 (detailedErrorsToClient)"
                      name="detailedErrorsToClient"
                      tooltip="*bool 三态字段：未设置=后端 Complete() 默认 true"
                    >
                      <Select options={tristateOptions} placeholder="未设置（默认 true）" />
                    </Form.Item>
                  </Col>
                </Row>
              </>
            ),
          },

          // ─── 2. 认证 (auth.*) ───
          {
            key: 'auth',
            label: <Space><Tag color="purple" bordered={false}>auth</Tag>认证</Space>,
            children: (
              <>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item label="认证方式 (auth.method)" name="authMethod">
                      <Select options={authMethodOptions} />
                    </Form.Item>
                  </Col>
                  <Col span={16}>
                    <Form.Item
                      noStyle
                      shouldUpdate={(p, c) => p.authMethod !== c.authMethod}
                    >
                      {({ getFieldValue }) =>
                        getFieldValue('authMethod') === 'token' ? (
                          <Form.Item label="Token 密钥 (auth.token)" name="authToken">
                            <Input.Password placeholder="客户端连接此服务端使用的密钥" />
                          </Form.Item>
                        ) : null
                      }
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item
                  label="附加鉴权范围 (auth.additionalScopes)"
                  name="authAdditionalScopes"
                  tooltip="对哪些消息也带 token 校验：HeartBeats / NewWorkConns"
                >
                  <Select
                    mode="multiple"
                    allowClear
                    options={[
                      { value: 'HeartBeats', label: 'HeartBeats（心跳也带 token）' },
                      { value: 'NewWorkConns', label: 'NewWorkConns（建立工作连接也带 token）' },
                    ]}
                    placeholder="按需多选"
                  />
                </Form.Item>

                <Form.Item
                  noStyle
                  shouldUpdate={(p, c) => p.authMethod !== c.authMethod}
                >
                  {({ getFieldValue }) =>
                    getFieldValue('authMethod') === 'oidc' ? (
                      <>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item label="OIDC Issuer (auth.oidc.issuer)" name="authOidcIssuer">
                              <Input placeholder="https://accounts.example.com" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="OIDC Audience (auth.oidc.audience)" name="authOidcAudience">
                              <Input placeholder="client-id" />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              label="跳过过期校验 (auth.oidc.skipExpiryCheck)"
                              name="authOidcSkipExpiryCheck"
                              valuePropName="checked"
                            >
                              <Switch />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              label="跳过 Issuer 校验 (auth.oidc.skipIssuerCheck)"
                              name="authOidcSkipIssuerCheck"
                              valuePropName="checked"
                            >
                              <Switch />
                            </Form.Item>
                          </Col>
                        </Row>
                      </>
                    ) : null
                  }
                </Form.Item>
              </>
            ),
          },

          // ─── 3. 传输 (transport.*) ───
          {
            key: 'transport',
            label: <Space><Tag color="cyan" bordered={false}>transport</Tag>传输层（连接 / QUIC / TLS）</Space>,
            children: (
              <>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      label="TCP 多路复用 (transport.tcpMux)"
                      name="transportTcpMux"
                      tooltip="*bool 三态：未设置=后端 Complete() 默认 true"
                    >
                      <Select options={tristateOptions} placeholder="未设置（默认 true）" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      label="TCPMux 保活间隔 (transport.tcpMuxKeepaliveInterval)"
                      name="transportTcpMuxKeepaliveInterval"
                      tooltip="单位秒，默认 30"
                    >
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="30" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      label="TCP Keepalive (transport.tcpKeepalive)"
                      name="transportTcpKeepalive"
                      tooltip="单位秒，默认 7200；负数禁用。JSON 标签是 tcpKeepalive（小写 a）"
                    >
                      <InputNumber style={{ width: '100%' }} placeholder="7200" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="每代理最大连接池 (transport.maxPoolCount)"
                      name="transportMaxPoolCount"
                      tooltip="默认 5"
                    >
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="5" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="心跳超时 (transport.heartbeatTimeout)"
                      name="transportHeartbeatTimeout"
                      tooltip="单位秒，开启 TCPMux 时默认 -1（禁用），否则默认 90"
                    >
                      <InputNumber style={{ width: '100%' }} placeholder="-1 / 90" />
                    </Form.Item>
                  </Col>
                </Row>

                <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>QUIC 选项 (transport.quic.*)</Text>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      label="QUIC Keepalive 周期 (quic.keepalivePeriod)"
                      name="transportQuicKeepalivePeriod"
                    >
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="10" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="QUIC 空闲超时 (quic.maxIdleTimeout)" name="transportQuicMaxIdleTimeout">
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="30" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="QUIC 最大流数 (quic.maxIncomingStreams)" name="transportQuicMaxIncomingStreams">
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="100000" />
                    </Form.Item>
                  </Col>
                </Row>

                <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>TLS (transport.tls.*)</Text>
                <Row gutter={16}>
                  <Col span={6}>
                    <Form.Item
                      label="强制 TLS (transport.tls.force)"
                      name="transportTlsForce"
                      valuePropName="checked"
                      tooltip="开启后只接受 TLS 加密的 frpc 连接"
                    >
                      <Switch />
                    </Form.Item>
                  </Col>
                  <Col span={18}>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="TLS 证书 (transport.tls.certFile)" name="transportTlsCertFile">
                          <Input placeholder="/path/to/server.crt" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="TLS 私钥 (transport.tls.keyFile)" name="transportTlsKeyFile">
                          <Input placeholder="/path/to/server.key" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item label="TLS 受信 CA (transport.tls.trustedCaFile)" name="transportTlsTrustedCaFile">
                      <Input placeholder="/path/to/ca.crt（开启 mTLS）" />
                    </Form.Item>
                  </Col>
                </Row>
              </>
            ),
          },

          // ─── 4. 虚拟主机 (vhost.*) ───
          {
            key: 'vhost',
            label: <Space><Tag color="green" bordered={false}>vhost</Tag>HTTP / HTTPS 虚拟主机</Space>,
            children: (
              <>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="HTTP 端口 (vhostHTTPPort)" name="vhostHTTPPort">
                      <InputNumber min={0} max={65535} style={{ width: '100%' }} placeholder="80（0 禁用）" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="HTTPS 端口 (vhostHTTPSPort)" name="vhostHTTPSPort">
                      <InputNumber min={0} max={65535} style={{ width: '100%' }} placeholder="443（0 禁用）" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="vhost HTTP 响应头超时 (vhostHTTPTimeout)"
                      name="vhostHTTPTimeout"
                      tooltip="单位秒，默认 60"
                    >
                      <InputNumber min={1} style={{ width: '100%' }} placeholder="60" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="子域名根 (subDomainHost)" name="subDomainHost">
                      <Input placeholder="例如: frp.example.com" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label="自定义 404 页面 (custom404Page)" name="custom404Page">
                  <Input placeholder="/path/to/404.html（留空使用默认）" />
                </Form.Item>
              </>
            ),
          },

          // ─── 5. 端口白名单 / 限制 ───
          {
            key: 'ports',
            label: <Space><Tag color="orange" bordered={false}>限制</Tag>端口白名单 (allowPorts) / 每客户端上限</Space>,
            children: (
              <>
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="allowPorts 形状：每行 {start, end} 表示一个范围，或 {single} 表示单个端口"
                />
                <Form.List name="allowPorts">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map((field) => (
                        <Row key={field.key} gutter={8} style={{ marginBottom: 8 }}>
                          <Col span={6}>
                            <Form.Item
                              {...field}
                              label="起始 (start)"
                              name={[field.name, 'start']}
                              key={`${field.key}-start`}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="6000" />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item
                              {...field}
                              label="结束 (end)"
                              name={[field.name, 'end']}
                              key={`${field.key}-end`}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="6010" />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item
                              {...field}
                              label="单端口 (single)"
                              name={[field.name, 'single']}
                              key={`${field.key}-single`}
                              tooltip="设了 single 则忽略 start/end"
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="7100" />
                            </Form.Item>
                          </Col>
                          <Col span={6} style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <Button
                              danger
                              type="text"
                              icon={<MinusCircleOutlined />}
                              onClick={() => remove(field.name)}
                            >
                              删除
                            </Button>
                          </Col>
                        </Row>
                      ))}
                      <Button
                        type="dashed"
                        block
                        icon={<PlusOutlined />}
                        onClick={() => add({})}
                        style={{ marginBottom: 12 }}
                      >
                        新增端口范围
                      </Button>
                    </>
                  )}
                </Form.List>
                <Form.Item label="每客户端最大端口数 (maxPortsPerClient)" name="maxPortsPerClient" tooltip="0 表示不限">
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="0=不限" />
                </Form.Item>
              </>
            ),
          },

          // ─── 6. SSH 网关 ───
          {
            key: 'ssh',
            label: <Space><Tag color="geekblue" bordered={false}>ssh</Tag>SSH 隧道网关 (sshTunnelGateway)</Space>,
            children: (
              <>
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="启用后，frps 会同时开一个 SSH 服务，客户端可通过 ssh -R 创建 TCP 隧道"
                />
                <Row gutter={16}>
                  <Col span={6}>
                    <Form.Item label="监听端口 (sshTunnelGateway.bindPort)" name="sshBindPort">
                      <InputNumber min={0} max={65535} style={{ width: '100%' }} placeholder="0=禁用" />
                    </Form.Item>
                  </Col>
                  <Col span={18}>
                    <Form.Item label="自动生成私钥路径 (autoGenPrivateKeyPath)" name="sshAutoGenPrivateKeyPath" tooltip="默认 ./.autogen_ssh_key">
                      <Input placeholder="./.autogen_ssh_key" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="自定义私钥 (privateKeyFile)" name="sshPrivateKeyFile">
                      <Input placeholder="/etc/ssh/ssh_host_rsa_key" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="授权公钥文件 (authorizedKeysFile)" name="sshAuthorizedKeysFile">
                      <Input placeholder="~/.ssh/authorized_keys" />
                    </Form.Item>
                  </Col>
                </Row>
              </>
            ),
          },

          // ─── 7. 日志 (log.*) ───
          {
            key: 'log',
            label: <Space><Tag color="gold" bordered={false}>log</Tag>日志</Space>,
            children: (
              <>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item label="级别 (log.level)" name="logLevel">
                      <Select options={logLevelOptions} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="保留天数 (log.maxDays)" name="logMaxDays" tooltip="默认 3">
                      <InputNumber min={1} max={365} style={{ width: '100%' }} placeholder="3" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      label="禁用控制台颜色 (log.disablePrintColor)"
                      name="logDisablePrintColor"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item
                  label="输出位置 (log.to)"
                  name="logTo"
                  tooltip="console 输出到 stdout；填写路径则写文件。本管理器统一接管 worker 输出，此处一般留默认即可。"
                >
                  <Input placeholder="console / /var/log/frps.log" />
                </Form.Item>
              </>
            ),
          },

          // ─── 8. webServer（只读展示 + 提示） ───
          {
            key: 'webserver',
            label: <Space><Tag color="red" bordered={false}>只读</Tag>webServer（管理器接管）</Space>,
            children: (
              <>
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="⚠️ 本管理器在 worker 启动时强制覆盖 webServer 为 loopback + 随机账密，此处的值不会生效，仅作为已存在配置的展示。表单提交时不会发送 webServer 字段。"
                />
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="addr">
                      <Input value={envelopeWebServer?.addr ?? ''} disabled placeholder="（未设置）" />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="port">
                      <Input value={envelopeWebServer?.port == null ? '' : String(envelopeWebServer.port)} disabled placeholder="（未设置）" />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="user">
                      <Input value={envelopeWebServer?.user ?? ''} disabled placeholder="（未设置）" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="password">
                      <Input value={envelopeWebServer?.password ?? ''} disabled placeholder="（未设置）" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="pprofEnable">
                      <Input value={envelopeWebServer?.pprofEnable ? 'true' : 'false'} disabled />
                    </Form.Item>
                  </Col>
                </Row>
              </>
            ),
          },

          // ─── 9. 高级 ───
          {
            key: 'advanced',
            label: <Space><Tag bordered={false}>高级</Tag>UDP / NAT 探测 / 用户连接超时</Space>,
            children: (
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="UDP 包大小 (udpPacketSize)" name="udpPacketSize" tooltip="默认 1500">
                    <InputNumber min={0} style={{ width: '100%' }} placeholder="1500" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="用户连接超时 (userConnTimeout)" name="userConnTimeout" tooltip="单位秒，默认 10">
                    <InputNumber min={0} style={{ width: '100%' }} placeholder="10" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="NAT 分析数据保留 (natholeAnalysisDataReserveHours)"
                    name="natholeAnalysisDataReserveHours"
                    tooltip="单位小时，默认 168（7 天）。注意 JSON 标签开头是小写的 nathole，不是 natHole"
                  >
                    <InputNumber min={0} style={{ width: '100%' }} placeholder="168" />
                  </Form.Item>
                </Col>
              </Row>
            ),
          },
        ]}
      />

      <Form.Item style={{ marginTop: 16, borderTop: `1px solid ${themeBorderColor}`, paddingTop: 16, textAlign: 'right' }}>
        <Button type="primary" htmlType="submit">保存服务端配置</Button>
      </Form.Item>
    </>
  );
};

export default ServerConfigGroups;
