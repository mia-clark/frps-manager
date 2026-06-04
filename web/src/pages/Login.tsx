import { useState, useEffect } from 'react';
import { Card, Input, Button, Form, Typography, Space, App, theme as antdTheme } from 'antd';
import { KeyOutlined, SafetyCertificateOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import client, { setAPIToken, getAPIToken } from '../api/client';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { token } = antdTheme.useToken();
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (getAPIToken()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const onFinish = async (values: { token: string }) => {
    setLoading(true);
    try {
      setAPIToken(values.token);
      const resp = await client.get('/api/v1/version');
      if (resp.status === 200) {
        message.success('连接成功，已授权登录');
        navigate('/dashboard');
      } else {
        throw new Error('鉴权未通过');
      }
    } catch {
      setAPIToken('');
      message.error('Token 校验失败，请确认守护进程是否已配置该密钥');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        width: '100vw',
        background: token.colorBgLayout,
        backgroundImage: `radial-gradient(circle at 20% 25%, ${token.colorPrimaryBg} 0%, transparent 55%), radial-gradient(circle at 85% 75%, ${token.colorInfoBg} 0%, transparent 60%)`,
      }}
    >
      <Card
        style={{
          width: 420,
          borderRadius: 16,
          boxShadow: token.boxShadowSecondary,
        }}
        styles={{ body: { padding: 32 } }}
      >
        <Space direction="vertical" size={20} style={{ width: '100%', textAlign: 'center' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: token.colorPrimaryBg,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              border: `1px solid ${token.colorPrimaryBorder}`,
            }}
          >
            <SafetyCertificateOutlined style={{ fontSize: 30, color: token.colorPrimary }} />
          </div>
          <div>
            <Title level={3} style={{ margin: 0, fontWeight: 600 }}>
              FRP 控制台登录
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              请输入 FRP Manager 守护进程配置的 API 鉴权密钥以开始管理。
            </Text>
          </div>
        </Space>

        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          requiredMark={false}
          style={{ marginTop: 24 }}
        >
          <Form.Item name="token" rules={[{ required: true, message: '请输入 API 令牌密钥！' }]}>
            <Input.Password
              prefix={<KeyOutlined />}
              placeholder="API Token (Bearer 令牌)"
              size="large"
              autoFocus
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block
              icon={<ArrowRightOutlined />}
            >
              验证并进入控制台
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
