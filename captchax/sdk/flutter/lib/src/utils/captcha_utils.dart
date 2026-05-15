import 'dart:math';

class CaptchaUtils {
  static final Random _random = Random();

  static double randomDouble(double min, double max) {
    return min + _random.nextDouble() * (max - min);
  }

  static int randomInt(int min, int max) {
    return min + _random.nextInt(max - min + 1);
  }

  static List<double> generateTrackPoint(double targetX, int points) {
    final track = <double>[];
    for (int i = 0; i <= points; i++) {
      final progress = i / points;
      final x = targetX * progress + randomDouble(-5, 5);
      track.add(x.clamp(0, targetX));
    }
    return track;
  }

  static double calculateDistance(double x1, double y1, double x2, double y2) {
    return sqrt(pow(x2 - x1, 2) + pow(y2 - y1, 2));
  }

  static double calculateAngle(double centerX, double centerY, double x, double y) {
    final dx = x - centerX;
    final dy = y - centerY;
    return atan2(dy, dx) * 180 / pi;
  }

  static bool isPointInCircle(double px, double py, double cx, double cy, double r) {
    return calculateDistance(px, py, cx, cy) <= r;
  }

  static bool isPointInRect(double px, double py, double rx, double ry, double rw, double rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }

  static String formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }
}
