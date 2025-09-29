#!/bin/bash

# Chat System 自动化部署脚本
# 使用方法: ./deploy.sh [environment]
# 环境选项: development, staging, production

set -e  # 遇到错误时退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为 root 用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用 root 权限运行此脚本"
        log_info "使用命令: sudo ./deploy.sh"
        exit 1
    fi
}

# 环境配置
ENVIRONMENT=${1:-production}
APP_NAME="chat_system"
APP_USER="www-data"
APP_GROUP="www-data"
APP_DIR="/var/www/$APP_NAME"
VENV_DIR="$APP_DIR/venv"
SERVICE_NAME="$APP_NAME"
BACKUP_DIR="/var/backups/$APP_NAME"

log_info "开始部署 $APP_NAME 到 $ENVIRONMENT 环境"

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."
    
    mkdir -p $APP_DIR
    mkdir -p $APP_DIR/instance
    mkdir -p $APP_DIR/instance/uploads
    mkdir -p /var/log/$APP_NAME
    mkdir -p /var/run/$APP_NAME
    mkdir -p $BACKUP_DIR
    
    log_success "目录创建完成"
}

# 安装系统依赖
install_system_dependencies() {
    log_info "安装系统依赖..."
    
    apt update
    apt install -y python3 python3-pip python3-venv nginx supervisor sqlite3
    apt install -y build-essential python3-dev libssl-dev libffi-dev
    
    # 安装 Node.js (如果需要前端构建)
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        apt install -y nodejs
    fi
    
    log_success "系统依赖安装完成"
}

# 创建 Python 虚拟环境
setup_python_environment() {
    log_info "设置 Python 环境..."
    
    if [ ! -d "$VENV_DIR" ]; then
        python3 -m venv $VENV_DIR
        log_success "虚拟环境创建完成"
    else
        log_info "虚拟环境已存在，跳过创建"
    fi
    
    # 激活虚拟环境并安装依赖
    source $VENV_DIR/bin/activate
    pip install --upgrade pip
    pip install -r $APP_DIR/requirements.txt
    pip install gunicorn eventlet
    
    log_success "Python 依赖安装完成"
}

# 配置数据库
setup_database() {
    log_info "配置数据库..."
    
    cd $APP_DIR
    source $VENV_DIR/bin/activate
    
    # 运行数据库初始化
    export FLASK_ENV=$ENVIRONMENT
    python flask/init_db.py
    
    log_success "数据库配置完成"
}

# 配置 Nginx
setup_nginx() {
    log_info "配置 Nginx..."
    
    # 复制 Nginx 配置
    cp $APP_DIR/nginx.conf /etc/nginx/sites-available/$APP_NAME
    
    # 创建软链接
    if [ ! -L "/etc/nginx/sites-enabled/$APP_NAME" ]; then
        ln -s /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    fi
    
    # 测试 Nginx 配置
    nginx -t
    if [ $? -eq 0 ]; then
        log_success "Nginx 配置测试通过"
    else
        log_error "Nginx 配置测试失败"
        exit 1
    fi
    
    # 重新加载 Nginx
    systemctl reload nginx
    log_success "Nginx 配置完成"
}

# 配置 systemd 服务
setup_systemd_service() {
    log_info "配置 systemd 服务..."
    
    # 复制服务文件
    cp $APP_DIR/$SERVICE_NAME.service /etc/systemd/system/
    
    # 重新加载 systemd
    systemctl daemon-reload
    
    # 启用服务
    systemctl enable $SERVICE_NAME
    
    log_success "systemd 服务配置完成"
}

# 设置文件权限
set_permissions() {
    log_info "设置文件权限..."
    
    # 设置目录所有者
    chown -R $APP_USER:$APP_GROUP $APP_DIR
    chown -R $APP_USER:$APP_GROUP /var/log/$APP_NAME
    chown -R $APP_USER:$APP_GROUP /var/run/$APP_NAME
    
    # 设置权限
    chmod -R 755 $APP_DIR
    chmod -R 644 $APP_DIR/flask/static
    chmod -R 755 $APP_DIR/flask/static/uploads
    chmod -R 755 $APP_DIR/instance
    chmod -R 755 $APP_DIR/instance/uploads
    
    # 设置可执行权限
    chmod +x $APP_DIR/venv/bin/*
    
    log_success "文件权限设置完成"
}

# 创建备份
create_backup() {
    if [ -f "$APP_DIR/instance/chat_system.sqlite" ]; then
        log_info "创建数据库备份..."
        
        BACKUP_FILE="$BACKUP_DIR/chat_system_$(date +%Y%m%d_%H%M%S).sqlite"
        cp "$APP_DIR/instance/chat_system.sqlite" "$BACKUP_FILE"
        
        log_success "备份创建完成: $BACKUP_FILE"
    fi
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    # 启动应用服务
    systemctl start $SERVICE_NAME
    systemctl status $SERVICE_NAME --no-pager
    
    # 确保 Nginx 运行
    systemctl start nginx
    systemctl status nginx --no-pager
    
    log_success "服务启动完成"
}

# 验证部署
verify_deployment() {
    log_info "验证部署..."
    
    # 检查服务状态
    if systemctl is-active --quiet $SERVICE_NAME; then
        log_success "$SERVICE_NAME 服务运行正常"
    else
        log_error "$SERVICE_NAME 服务未运行"
        exit 1
    fi
    
    if systemctl is-active --quiet nginx; then
        log_success "Nginx 服务运行正常"
    else
        log_error "Nginx 服务未运行"
        exit 1
    fi
    
    # 检查端口
    if netstat -tulpn | grep -q ":5000"; then
        log_success "应用端口 5000 正在监听"
    else
        log_warning "应用端口 5000 未监听，请检查配置"
    fi
    
    if netstat -tulpn | grep -q ":80\|:443"; then
        log_success "Nginx 端口正在监听"
    else
        log_warning "Nginx 端口未监听，请检查配置"
    fi
    
    log_success "部署验证完成"
}

# 显示部署信息
show_deployment_info() {
    log_info "部署信息:"
    echo "应用目录: $APP_DIR"
    echo "虚拟环境: $VENV_DIR"
    echo "日志文件: /var/log/$APP_NAME/"
    echo "服务名称: $SERVICE_NAME"
    echo ""
    log_info "常用命令:"
    echo "查看应用日志: sudo journalctl -u $SERVICE_NAME -f"
    echo "查看 Nginx 日志: sudo tail -f /var/log/nginx/chat_system_*.log"
    echo "重启应用: sudo systemctl restart $SERVICE_NAME"
    echo "重启 Nginx: sudo systemctl restart nginx"
    echo ""
    log_success "部署完成！"
}

# 主部署流程
main() {
    check_root
    
    log_info "开始自动化部署流程..."
    
    create_directories
    install_system_dependencies
    setup_python_environment
    create_backup
    setup_database
    setup_nginx
    setup_systemd_service
    set_permissions
    start_services
    verify_deployment
    show_deployment_info
}

# 错误处理
trap 'log_error "部署过程中出现错误，请查看上面的错误信息"; exit 1' ERR

# 执行主函数
main "$@"
