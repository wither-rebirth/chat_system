#!/bin/bash

# 默认只运行迁移
RUN_TEST=false
ENCRYPTED_TEST=false
SHOW_HELP=false

# 解析命令行参数
for arg in "$@"
do
    case $arg in
        -t|--test)
        RUN_TEST=true
        shift
        ;;
        -e|--encrypted-test)
        ENCRYPTED_TEST=true
        shift
        ;;
        -h|--help)
        SHOW_HELP=true
        shift
        ;;
        *)
        # 未知参数
        echo "未知参数: $arg"
        SHOW_HELP=true
        shift
        ;;
    esac
done

if [ "$SHOW_HELP" = true ]; then
    echo "用法: $0 [选项]"
    echo "选项:"
    echo "  -t, --test           运行测试脚本，验证数据库修复是否成功"
    echo "  -e, --encrypted-test 运行加密消息测试，验证发送加密消息是否会写入密钥"
    echo "  -h, --help           显示此帮助信息"
    exit 0
fi

echo "开始执行数据库迁移..."

# 检查 Python 环境
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
elif command -v python &> /dev/null; then
    PYTHON_CMD=python
else
    echo "错误: 未找到 Python 环境"
    exit 1
fi

# 运行迁移脚本
echo "运行 add_nonce_to_key_shares.py 迁移..."
$PYTHON_CMD flask/migrations/add_nonce_to_key_shares.py

# 检查迁移结果
if [ $? -eq 0 ]; then
    echo "迁移成功完成!"
else
    echo "迁移过程中出现错误!"
    exit 1
fi

# 如果指定了测试选项，则运行测试脚本
if [ "$RUN_TEST" = true ]; then
    echo ""
    echo "运行数据库测试脚本..."
    $PYTHON_CMD flask/test_db_nonce.py
    
    # 检查测试结果
    if [ $? -eq 0 ]; then
        echo "测试成功完成!"
    else
        echo "测试过程中发现问题!"
        exit 1
    fi
fi

# 如果指定了加密消息测试选项，则运行加密消息测试脚本
if [ "$ENCRYPTED_TEST" = true ]; then
    echo ""
    echo "运行加密消息测试脚本..."
    $PYTHON_CMD flask/test_send_encrypted.py
    
    # 检查测试结果
    if [ $? -eq 0 ]; then
        echo "加密消息测试成功完成!"
    else
        echo "加密消息测试过程中发现问题!"
        exit 1
    fi
fi

echo "所有操作已完成" 