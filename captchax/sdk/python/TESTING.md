# CaptchaX Python SDK 测试指南

## 目录

- [测试概览](#测试概览)
- [测试环境设置](#测试环境设置)
- [运行测试](#运行测试)
- [测试分类](#测试分类)
- [测试覆盖范围](#测试覆盖范围)
- [代码覆盖率](#代码覆盖率)
- [编写新测试](#编写新测试)
- [最佳实践](#最佳实践)

## 测试概览

CaptchaX Python SDK 提供了全面的测试套件，包括：

- **220 个测试用例** (其中 193 个单元测试)
- **90.52% 代码覆盖率**
- 支持多种测试类型：单元测试、Mock测试、集成测试等

## 测试环境设置

### 安装测试依赖

```bash
pip install -e ".[dev]"
```

这将安装所有开发依赖，包括：
- pytest
- pytest-cov
- pytest-asyncio
- httpx
- unittest.mock (标准库)

## 运行测试

### 运行所有单元测试（跳过集成测试）

```bash
pytest tests/ -m "not integration"
```

### 运行所有测试（包括集成测试）

```bash
pytest tests/
```

⚠️ **注意**: 集成测试需要 CaptchaX 服务器运行在 `http://localhost:3000`

### 运行特定测试文件

```bash
# 运行单元测试
pytest tests/test_unit.py

# 运行Mock测试
pytest tests/test_mock.py

# 运行错误处理测试
pytest tests/test_error_handling.py

# 运行并发测试
pytest tests/test_concurrency.py

# 运行类型测试
pytest tests/test_types.py

# 运行集成测试
pytest tests/test_integration.py
```

### 运行特定测试类

```bash
pytest tests/test_unit.py::TestSliderCaptcha
pytest tests/test_error_handling.py::TestHTTPErrorHandling
```

### 运行带覆盖率的测试

```bash
# 生成覆盖率报告
pytest tests/ -m "not integration" --cov=src/captchax --cov-report=term-missing

# 生成HTML覆盖率报告
pytest tests/ -m "not integration" --cov=src/captchax --cov-report=html

# 生成XML覆盖率报告（适用于CI/CD）
pytest tests/ -m "not integration" --cov=src/captchax --cov-report=xml
```

## 测试分类

### 1. 单元测试 (test_unit.py)

测试 SDK 的核心功能，包括：

- ✅ HttpClient 初始化和配置
- ✅ CaptchaXClient 初始化和配置
- ✅ 滑动验证码生成和验证
- ✅ 点选验证码生成和验证
- ✅ 拼图验证码生成和验证
- ✅ 健康检查
- ✅ 批量验证
- ✅ 场景管理
- ✅ Webhook管理

### 2. Mock测试 (test_mock.py)

使用 unittest.mock 进行模拟测试：

- ✅ HTTP请求模拟
- ✅ 验证码生成/验证流程模拟
- ✅ 批量操作模拟
- ✅ 场景管理模拟
- ✅ Webhook管理模拟
- ✅ 健康检查模拟

### 3. 集成测试 (test_integration.py)

针对真实服务器的端到端测试：

- ✅ 健康检查集成测试
- ✅ 滑动验证码完整流程
- ✅ 点选验证码完整流程
- ✅ 拼图验证码完整流程
- ✅ 批量验证集成测试
- ✅ 场景管理集成测试
- ✅ Webhook管理集成测试

标记：`@pytest.mark.integration`

### 4. 错误处理测试 (test_error_handling.py)

测试各种错误场景：

- ✅ HTTP错误处理 (400, 401, 403, 404, 429, 500)
- ✅ 网络错误处理 (超时、连接拒绝、DNS失败)
- ✅ 重试逻辑测试
- ✅ 响应验证测试
- ✅ 头部验证测试
- ✅ HTTP方法验证

### 5. 并发测试 (test_concurrency.py)

测试多线程和并发场景：

- ✅ 并行验证码生成
- ✅ 并行验证码验证
- ✅ 批量操作并发
- ✅ 线程安全测试
- ✅ 高负载测试
- ✅ 竞态条件处理

### 6. 类型测试 (test_types.py)

验证类型提示和类型安全：

- ✅ 所有数据类字段和类型
- ✅ 可选字段处理
- ✅ 枚举类型
- ✅ 联合类型
- ✅ 类型转换

## 测试覆盖范围

### CaptchaXClient 方法覆盖

| 方法 | 覆盖状态 |
|------|---------|
| `__init__` | ✅ 完全覆盖 |
| `health_check` | ✅ 完全覆盖 |
| `generate_slider_captcha` | ✅ 完全覆盖 |
| `verify_slider_captcha` | ✅ 完全覆盖 |
| `generate_click_captcha` | ✅ 完全覆盖 |
| `verify_click_captcha` | ✅ 完全覆盖 |
| `generate_puzzle_captcha` | ✅ 完全覆盖 |
| `verify_puzzle_captcha` | ✅ 完全覆盖 |
| `batch_verify` | ✅ 完全覆盖 |
| `list_scenarios` | ✅ 完全覆盖 |
| `create_scenario` | ✅ 完全覆盖 |
| `get_scenario` | ✅ 完全覆盖 |
| `update_scenario` | ✅ 完全覆盖 |
| `delete_scenario` | ✅ 完全覆盖 |
| `register_webhook` | ✅ 完全覆盖 |
| `list_webhooks` | ✅ 完全覆盖 |
| `update_webhook` | ✅ 完全覆盖 |
| `unregister_webhook` | ✅ 完全覆盖 |
| `generate_and_verify_slider` | ✅ 完全覆盖 |
| `generate_and_verify_click` | ✅ 完全覆盖 |

### HttpClient 方法覆盖

| 方法 | 覆盖状态 |
|------|---------|
| `get` | ✅ 完全覆盖 |
| `post` | ✅ 完全覆盖 |
| `put` | ✅ 完全覆盖 |
| `delete` | ✅ 完全覆盖 |
| `set_header` | ✅ 完全覆盖 |
| `set_headers` | ✅ 完全覆盖 |
| `_request` | ✅ 部分覆盖 |

## 代码覆盖率

### 当前覆盖率统计

```
名称                     语句   缺失  分支  BrPart   覆盖率   未覆盖
------------------------------------------------------------------------
src/captchax/client.py    247     17     92     21   88.79%   84, 96, 98...
src/captchax/types.py      62      0      0      0  100.00%
------------------------------------------------------------------------
总计                       309     17     92     21   90.52%
```

### 查看详细覆盖率报告

```bash
# 生成HTML报告
pytest tests/ -m "not integration" --cov=src/captchax --cov-report=html

# 查看HTML报告
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
```

## 编写新测试

### 测试命名规范

```python
class TestClassName:
    """测试类的文档字符串"""
    
    def test_method_name_expected_behavior(self):
        """测试方法的文档字符串"""
        # 测试代码
        pass
```

### 示例：添加新的验证码类型测试

```python
def test_new_captcha_type_success(self):
    """Test generating new captcha type successfully."""
    with patch('captchax.client.HttpClient') as MockHttpClient:
        mock_http = MockHttpClient.return_value
        mock_http.post.return_value = {
            'code': 200,
            'message': 'success',
            'data': {
                'id': 'new-captcha-123',
                'image': 'base64_data',
                'target_x': 100,
                'target_y': 50,
            },
        }
        
        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)
        result = client.generate_new_captcha()
        
        assert result.id == 'new-captcha-123'
        assert result.target_x == 100
```

### 示例：添加错误处理测试

```python
def test_error_handling_for_specific_case(self):
    """Test error handling for specific failure case."""
    with patch('captchax.client.HttpClient') as MockHttpClient:
        mock_http = MockHttpClient.return_value
        mock_http.post.side_effect = CaptchaXError(
            message='Specific error message',
            code=400,
            status_code=400,
        )
        
        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)
        
        with pytest.raises(CaptchaXError) as exc_info:
            client.some_method()
        
        assert exc_info.value.code == 400
        assert 'Specific error' in str(exc_info.value)
```

## 最佳实践

### 1. Mock外部依赖

```python
# ✅ 正确：Mock HTTP客户端
@patch('captchax.client.HttpClient')
def test_with_mock(self, mock_http):
    mock_http.return_value.post.return_value = {...}
    # 测试代码

# ❌ 错误：直接调用外部API
def test_without_mock(self):
    client = CaptchaXClient(config)
    client.health_check()  # 会发起真实HTTP请求
```

### 2. 使用Fixture管理测试数据

```python
@pytest.fixture
def test_config():
    """提供测试配置"""
    return CaptchaConfig(
        base_url='http://localhost:3000',
        app_id='test-app',
    )

def test_with_fixture(test_config):
    client = CaptchaXClient(test_config)
    # 测试代码
```

### 3. 参数化测试

```python
@pytest.mark.parametrize("captcha_type,expected_fields", [
    ("slider", ["id", "background_b64", "slider_b64"]),
    ("click", ["id", "image", "target_chars"]),
    ("puzzle", ["id", "background_b64", "puzzle_b64"]),
])
def test_captcha_structure(captcha_type, expected_fields):
    # 测试代码
    pass
```

### 4. 集成测试标记

```python
@pytest.mark.integration
class TestIntegration:
    """集成测试类"""
    
    @pytest.mark.slow
    def test_slow_operation(self):
        """慢速集成测试"""
        pass
```

### 5. 测试隔离

```python
def test_isolation_example():
    """每个测试应该是独立的，不依赖其他测试"""
    # 设置
    config = CaptchaConfig(base_url='http://localhost:3000')
    client = CaptchaXClient(config)
    
    # 动作
    result = client.health_check()
    
    # 断言
    assert result.status == 'healthy'
    # 不需要清理（测试间隔离）
```

## 持续集成

### GitHub Actions 示例

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.8'
    
    - name: Install dependencies
      run: |
        pip install -e ".[dev]"
    
    - name: Run tests
      run: |
        pytest tests/ -m "not integration" --cov=src/captchax --cov-report=xml
    
    - name: Upload coverage
      uses: codecov/codecov-action@v2
      with:
        file: ./coverage.xml
```

### 本地CI检查

```bash
# 运行所有检查
pip install -e ".[dev]"
pytest tests/ -m "not integration" --cov=src/captchax --cov-report=term-missing
mypy src/captchax/
black --check src/captchax/
```

## 故障排除

### 测试失败

1. 检查依赖是否正确安装
2. 确认服务器是否运行（集成测试）
3. 查看详细错误信息：

```bash
pytest tests/ -v --tb=long
```

### 覆盖率过低

1. 运行详细覆盖率报告：
```bash
pytest tests/ --cov=src/captchax --cov-report=term-missing
```

2. 查看未覆盖的代码行
3. 添加缺失的测试用例

### Mock不工作

1. 确认Mock路径正确：
   - `captchax.client.HttpClient` 用于Mock HttpClient类
   - `captchax.client.httpx.Client` 用于Mock httpx客户端

2. 检查Mock使用方式：
```python
# 对于类方法
with patch('captchax.client.HttpClient') as mock:

# 对于实例方法
mock_instance.post.return_value = {...}
```

## 获取帮助

- 📖 查看 [SDK文档](./docs/SDK.md)
- 🐛 报告 [问题](https://github.com/hjtpx/captchax/issues)
- 💬 参与 [讨论](https://github.com/hjtpx/captchax/discussions)

## 许可证

MIT License - 详见项目根目录 LICENSE 文件
