package admin

import (
	"time"

	"captchax/internal/repository"
	"captchax/pkg/response"

	"github.com/gin-gonic/gin"
)

// Router 路由管理
type Router struct {
	handlers *AdminHandlers
	auth     *AuthService
}

// NewRouter 创建路由管理器
func NewRouter(
	adminRepo *repository.AdminRepo,
	whitelistRepo *repository.WhitelistRepo,
	blacklistRepo *repository.BlacklistRepo,
	configRepo *repository.ConfigRepo,
	captchaRepo *repository.CaptchaRepo,
	jwtSecret string,
	tokenTTLSeconds int,
) *Router {
	tokenTTL := time.Duration(tokenTTLSeconds) * time.Second
	if tokenTTLSeconds <= 0 {
		tokenTTL = 24 * time.Hour
	}

	authService := NewAuthService(adminRepo, jwtSecret, tokenTTL)

	handlers := NewAdminHandlers(
		authService,
		adminRepo,
		whitelistRepo,
		blacklistRepo,
		configRepo,
		captchaRepo,
	)

	return &Router{
		handlers: handlers,
		auth:     authService,
	}
}

// RegisterRoutes 注册路由
func (r *Router) RegisterRoutes(router *gin.Engine) {
	router.LoadHTMLGlob("web/templates/admin/*.html")

	// 页面路由
	router.GET("/admin/login", r.handlers.ShowLoginPage)
	router.GET("/admin/dashboard", r.handlers.ShowDashboardPage)
	router.GET("/admin/stats", r.handlers.ShowStatsPage)
	router.GET("/admin/config", r.handlers.ShowConfigPage)
	router.GET("/admin/whitelist", r.handlers.ShowWhitelistPage)
	router.GET("/admin/blacklist", r.handlers.ShowBlacklistPage)

	// API路由
	apiGroup := router.Group("/admin/api")
	{
		apiGroup.POST("/login", r.handlers.Login)
		apiGroup.POST("/logout", r.handlers.Logout)

		protected := apiGroup.Group("")
		protected.Use(r.auth.AuthMiddleware())
		{
			// 仪表盘
			protected.GET("/dashboard", r.handlers.GetDashboard)

			// 统计
			protected.GET("/stats", r.handlers.GetStats)
			protected.GET("/stats/trend", r.handlers.GetTrend)
			protected.GET("/stats/captcha-distribution", r.handlers.GetCaptchaDistribution)
			protected.GET("/stats/ip-ranking", r.handlers.GetIPRanking)

			// 配置
			protected.GET("/config", r.handlers.GetConfig)
			protected.POST("/config", r.auth.SuperAdminOnly(), r.handlers.UpdateConfig)

			// 白名单
			protected.GET("/whitelist", r.handlers.GetWhitelist)
			protected.POST("/whitelist", r.handlers.AddWhitelist)
			protected.DELETE("/whitelist/:id", r.handlers.DeleteWhitelist)

			// 黑名单
			protected.GET("/blacklist", r.handlers.GetBlacklist)
			protected.POST("/blacklist", r.handlers.AddBlacklist)
			protected.DELETE("/blacklist/:id", r.handlers.DeleteBlacklist)
		}
	}

	router.NoRoute(func(c *gin.Context) {
		response.NotFound(c, "endpoint not found")
	})
}
