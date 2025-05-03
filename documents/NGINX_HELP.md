# Nginx反向代理配置问题解决指南

如果在使用Nginx反向代理后出现登录页面无法正常进入的问题，可以参考以下解决方案：

## 常见问题

1. **会话(Session)问题**：反向代理可能导致会话Cookie无法正确设置或传递
2. **WebSocket连接问题**：WebSocket可能无法通过反向代理正确连接
3. **头部信息不正确**：HTTP头信息可能未正确传递，导致应用无法识别真实客户端

## 已实施的解决方案

我们已经对代码进行了以下修改，以解决这些问题：

### 1. Nginx配置

- 添加了更多的代理头信息（`X-Forwarded-Host`, `X-Forwarded-Port`等）
- 配置了正确的Cookie处理（`proxy_cookie_path`和`proxy_cookie_domain`）
- 增加了超时设置，特别是WebSocket连接

### 2. Flask应用配置

- 扩展了`ProxyFix`中间件支持所有代理头
- 设置了`PREFERRED_URL_SCHEME`以确保URL生成正确
- 禁用了`WTF_CSRF_SSL_STRICT`以允许在HTTP上也接受CSRF令牌

### 3. WebSocket连接

- 改进了Socket.IO客户端初始化代码，使用完整的URL（包括协议）
- 增加了重连机制和错误处理
- 动态获取端口和协议，适应不同的部署环境

## 如何测试

使用以下命令启动应用：

```bash
# 使用HTTP协议（默认）
./start_server.sh 8000 http

# 或使用HTTPS协议
./start_server.sh 8000 https
```

然后通过Nginx反向代理访问应用。

## 其他解决方案

如果问题仍然存在，可以尝试：

1. **检查Nginx日志**：`/var/log/nginx/error.log`和`/var/log/nginx/access.log`
2. **检查Flask应用日志**，寻找错误信息
3. **使用浏览器开发工具**观察网络请求和响应，特别是Cookie和WebSocket连接
4. **临时禁用CSRF保护**进行测试：
   ```python
   app.config['WTF_CSRF_ENABLED'] = False
   ```
5. **确保Nginx配置文件中的路径正确**，特别是静态文件路径

## 常见的Nginx错误配置

1. 没有正确设置`proxy_set_header Host`
2. 没有为WebSocket配置`Upgrade`和`Connection`头
3. 缓冲设置不正确导致流数据处理问题
4. 没有设置足够长的超时时间
5. **Socket.IO路径重复问题**: 当`location /socket.io`和`proxy_pass http://127.0.0.1:8000/socket.io`同时存在时，会导致路径重复。Nginx不会自动去掉前缀，而是直接把它们连在一起，导致请求变成`/socket.io/socket.io/?EIO=4&...`，后端找不到这个路径返回404。

   **解决方案**:
   ```nginx
   # 正确配置
   location /socket.io/ {
       proxy_pass http://127.0.0.1:8000;  # 不包含路径部分
       # 其他配置保持不变
   }
   ```
   
   或者使用`rewrite`显式去掉前缀:
   ```nginx
   location /socket.io/ {
       rewrite ^/socket.io/(.*)$ /$1 break;  # 去掉前缀
       proxy_pass http://127.0.0.1:8000/socket.io/;
       # 其他配置保持不变
   }
   ```

## 进一步配置优化

如需进一步优化Nginx配置，可以考虑：

1. 启用HTTP/2
2. 配置Brotli或Gzip压缩
3. 设置静态文件缓存
4. 增加工作进程数 