#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(CaptchaXModule, NSObject)

RCT_EXTERN_METHOD(setBaseUrl:(NSString *)url)
RCT_EXTERN_METHOD(setTimeout:(int)timeout)
RCT_EXTERN_METHOD(getCaptcha:(NSString *)type
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(verifyCaptcha:(NSString *)captchaId
                  captchaType:(NSString *)captchaType
                  userResponse:(NSDictionary *)userResponse
                  track:(NSArray *)track
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(trackUserAction:(double)x
                  y:(double)y
                  timestamp:(double)timestamp)

@end
