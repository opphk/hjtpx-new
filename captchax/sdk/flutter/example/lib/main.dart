import 'package:flutter/material.dart';
import 'package:captcha_flutter/captcha_flutter.dart';

void main() {
  CaptchaX.initialize(
    baseUrl: 'http://localhost:3000',
    timeout: const Duration(seconds: 30),
    enableDebug: true,
  );
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CaptchaX Flutter Demo',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  CaptchaType? _selectedType;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('CaptchaX Flutter SDK'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
      ),
      body: _selectedType == null ? _buildTypeList() : _buildCaptchaDemo(),
    );
  }

  Widget _buildTypeList() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '选择验证码类型',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'CaptchaX Flutter SDK 支持多种验证码类型',
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 24),
          _buildTypeCard(
            type: CaptchaType.slider,
            title: '滑块验证码',
            description: '拖动滑块完成验证',
            icon: Icons.slideshow,
            color: Colors.blue,
          ),
          _buildTypeCard(
            type: CaptchaType.click,
            title: '点选验证码',
            description: '点击指定目标完成验证',
            icon: Icons.touch_app,
            color: Colors.green,
          ),
          _buildTypeCard(
            type: CaptchaType.puzzle,
            title: '拼图验证码',
            description: '拖动拼图块到正确位置',
            icon: Icons.extension,
            color: Colors.orange,
          ),
          _buildTypeCard(
            type: CaptchaType.rotate,
            title: '旋转验证码',
            description: '旋转图片对齐缺口',
            icon: Icons.rotate_right,
            color: Colors.purple,
          ),
          _buildTypeCard(
            type: CaptchaType.text,
            title: '文字验证码',
            description: '输入图片中的文字',
            icon: Icons.text_fields,
            color: Colors.red,
          ),
          _buildTypeCard(
            type: CaptchaType.icon,
            title: '图标验证码',
            description: '选择正确的图标',
            icon: Icons.grid_view,
            color: Colors.teal,
          ),
          const SizedBox(height: 32),
          _buildQuickDemo(),
        ],
      ),
    );
  }

  Widget _buildTypeCard({
    required CaptchaType type,
    required String title,
    required String description,
    required IconData icon,
    required Color color,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      child: ListTile(
        leading: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: color, size: 28),
        ),
        title: Text(
          title,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
        subtitle: Text(
          description,
          style: TextStyle(
            color: Colors.grey[600],
            fontSize: 14,
          ),
        ),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
        onTap: () {
          setState(() {
            _selectedType = type;
          });
        },
      ),
    );
  }

  Widget _buildQuickDemo() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '快速演示',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          '所有验证码类型一站式演示',
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey,
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const AllCaptchaDemo(),
                ),
              );
            },
            icon: const Icon(Icons.play_arrow),
            label: const Text('查看所有验证码演示'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              backgroundColor: Colors.blue,
              foregroundColor: Colors.white,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCaptchaDemo() {
    return Scaffold(
      appBar: AppBar(
        title: Text(_getTypeName(_selectedType!)),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            setState(() {
              _selectedType = null;
            });
          },
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _buildCaptchaWidget(_selectedType!),
            const SizedBox(height: 24),
            _buildUsageExample(_selectedType!),
          ],
        ),
      ),
    );
  }

  Widget _buildCaptchaWidget(CaptchaType type) {
    switch (type) {
      case CaptchaType.slider:
        return CaptchaSlider(
          width: MediaQuery.of(context).size.width - 32,
          onVerified: (result) {
            _showSnackBar('验证结果: ${result.success}');
          },
          onError: (error) {
            _showSnackBar('错误: $error', isError: true);
          },
        );
      case CaptchaType.click:
        return CaptchaClick(
          width: MediaQuery.of(context).size.width - 32,
          targetCount: 4,
          onVerified: (result) {
            _showSnackBar('验证结果: ${result.success}');
          },
          onError: (error) {
            _showSnackBar('错误: $error', isError: true);
          },
        );
      case CaptchaType.puzzle:
        return CaptchaPuzzle(
          width: MediaQuery.of(context).size.width - 32,
          onVerified: (result) {
            _showSnackBar('验证结果: ${result.success}');
          },
          onError: (error) {
            _showSnackBar('错误: $error', isError: true);
          },
        );
      case CaptchaType.rotate:
        return CaptchaRotate(
          width: MediaQuery.of(context).size.width - 32,
          height: 280,
          onVerified: (result) {
            _showSnackBar('验证结果: ${result.success}');
          },
          onError: (error) {
            _showSnackBar('错误: $error', isError: true);
          },
        );
      case CaptchaType.text:
        return CaptchaText(
          width: MediaQuery.of(context).size.width - 32,
          onVerified: (result) {
            _showSnackBar('验证结果: ${result.success}');
          },
          onError: (error) {
            _showSnackBar('错误: $error', isError: true);
          },
        );
      case CaptchaType.icon:
        return CaptchaIcon(
          width: MediaQuery.of(context).size.width - 32,
          targetCount: 3,
          onVerified: (result) {
            _showSnackBar('验证结果: ${result.success}');
          },
          onError: (error) {
            _showSnackBar('错误: $error', isError: true);
          },
        );
    }
  }

  Widget _buildUsageExample(CaptchaType type) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.code, color: Colors.blue[700]),
                const SizedBox(width: 8),
                const Text(
                  '使用示例',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const Divider(),
            const SizedBox(height: 8),
            SelectableText(
              _getUsageCode(type),
              style: TextStyle(
                fontFamily: 'monospace',
                fontSize: 13,
                color: Colors.grey[800],
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getTypeName(CaptchaType type) {
    switch (type) {
      case CaptchaType.slider:
        return '滑块验证码';
      case CaptchaType.click:
        return '点选验证码';
      case CaptchaType.puzzle:
        return '拼图验证码';
      case CaptchaType.rotate:
        return '旋转验证码';
      case CaptchaType.text:
        return '文字验证码';
      case CaptchaType.icon:
        return '图标验证码';
    }
  }

  String _getUsageCode(CaptchaType type) {
    switch (type) {
      case CaptchaType.slider:
        return '''CaptchaSlider(
  width: 320,
  onVerified: (result) {
    print('验证结果: \${result.success}');
  },
  onError: (error) {
    print('错误: \$error');
  },
)''';
      case CaptchaType.click:
        return '''CaptchaClick(
  width: 320,
  targetCount: 4,
  onVerified: (result) {
    print('验证结果: \${result.success}');
  },
)''';
      case CaptchaType.puzzle:
        return '''CaptchaPuzzle(
  width: 320,
  onVerified: (result) {
    print('验证结果: \${result.success}');
  },
)''';
      case CaptchaType.rotate:
        return '''CaptchaRotate(
  width: 320,
  height: 280,
  onVerified: (result) {
    print('验证结果: \${result.success}');
  },
)''';
      case CaptchaType.text:
        return '''CaptchaText(
  width: 320,
  onVerified: (result) {
    print('验证结果: \${result.success}');
  },
)''';
      case CaptchaType.icon:
        return '''CaptchaIcon(
  width: 320,
  targetCount: 3,
  onVerified: (result) {
    print('验证结果: \${result.success}');
  },
)''';
    }
  }

  void _showSnackBar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : Colors.green,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }
}

class AllCaptchaDemo extends StatefulWidget {
  const AllCaptchaDemo({super.key});

  @override
  State<AllCaptchaDemo> createState() => _AllCaptchaDemoState();
}

class _AllCaptchaDemoState extends State<AllCaptchaDemo> {
  int _currentIndex = 0;

  final List<CaptchaType> _types = CaptchaType.values;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('所有验证码演示'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          _buildTabBar(),
          Expanded(
            child: Center(
              child: _buildCaptchaWidget(_types[_currentIndex]),
            ),
          ),
          _buildNavigationBar(),
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    return Container(
      height: 60,
      color: Colors.grey[100],
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        itemCount: _types.length,
        itemBuilder: (context, index) {
          final isSelected = index == _currentIndex;
          return GestureDetector(
            onTap: () {
              setState(() {
                _currentIndex = index;
              });
            },
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 4),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected ? Colors.blue : Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isSelected ? Colors.blue : Colors.grey[300]!,
                ),
              ),
              child: Center(
                child: Text(
                  _getTypeName(_types[index]),
                  style: TextStyle(
                    color: isSelected ? Colors.white : Colors.grey[700],
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildCaptchaWidget(CaptchaType type) {
    switch (type) {
      case CaptchaType.slider:
        return CaptchaSlider(
          width: MediaQuery.of(context).size.width - 32,
          onVerified: (result) {
            _showSnackBar('✓ 滑块验证成功');
          },
          onError: (error) {
            _showSnackBar('✗ 滑块验证失败: $error', isError: true);
          },
        );
      case CaptchaType.click:
        return CaptchaClick(
          width: MediaQuery.of(context).size.width - 32,
          onVerified: (result) {
            _showSnackBar('✓ 点选验证成功');
          },
          onError: (error) {
            _showSnackBar('✗ 点选验证失败: $error', isError: true);
          },
        );
      case CaptchaType.puzzle:
        return CaptchaPuzzle(
          width: MediaQuery.of(context).size.width - 32,
          onVerified: (result) {
            _showSnackBar('✓ 拼图验证成功');
          },
          onError: (error) {
            _showSnackBar('✗ 拼图验证失败: $error', isError: true);
          },
        );
      case CaptchaType.rotate:
        return CaptchaRotate(
          width: MediaQuery.of(context).size.width - 32,
          height: 280,
          onVerified: (result) {
            _showSnackBar('✓ 旋转验证成功');
          },
          onError: (error) {
            _showSnackBar('✗ 旋转验证失败: $error', isError: true);
          },
        );
      case CaptchaType.text:
        return CaptchaText(
          width: MediaQuery.of(context).size.width - 32,
          onVerified: (result) {
            _showSnackBar('✓ 文字验证成功');
          },
          onError: (error) {
            _showSnackBar('✗ 文字验证失败: $error', isError: true);
          },
        );
      case CaptchaType.icon:
        return CaptchaIcon(
          width: MediaQuery.of(context).size.width - 32,
          onVerified: (result) {
            _showSnackBar('✓ 图标验证成功');
          },
          onError: (error) {
            _showSnackBar('✗ 图标验证失败: $error', isError: true);
          },
        );
    }
  }

  Widget _buildNavigationBar() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          ElevatedButton.icon(
            onPressed: _currentIndex > 0
                ? () {
                    setState(() {
                      _currentIndex--;
                    });
                  }
                : null,
            icon: const Icon(Icons.arrow_back),
            label: const Text('上一个'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.grey[300],
              foregroundColor: Colors.black87,
            ),
          ),
          Text(
            '${_currentIndex + 1} / ${_types.length}',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          ElevatedButton.icon(
            onPressed: _currentIndex < _types.length - 1
                ? () {
                    setState(() {
                      _currentIndex++;
                    });
                  }
                : null,
            icon: const Icon(Icons.arrow_forward),
            label: const Text('下一个'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  String _getTypeName(CaptchaType type) {
    switch (type) {
      case CaptchaType.slider:
        return '滑块';
      case CaptchaType.click:
        return '点选';
      case CaptchaType.puzzle:
        return '拼图';
      case CaptchaType.rotate:
        return '旋转';
      case CaptchaType.text:
        return '文字';
      case CaptchaType.icon:
        return '图标';
    }
  }

  void _showSnackBar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : Colors.green,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }
}
