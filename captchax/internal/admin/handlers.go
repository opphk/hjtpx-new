package admin

import (
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"captchax/internal/model"
	"captchax/internal/repository"
	"captchax/pkg/response"

	"github.com/gin-gonic/gin"
)

// AdminHandlers 管理后台处理器
type AdminHandlers struct {
	authService   *AuthService
	adminRepo     *repository.AdminRepo
	whitelistRepo *repository.WhitelistRepo
	blacklistRepo *repository.BlacklistRepo
	configRepo    *repository.ConfigRepo
	captchaRepo   *repository.CaptchaRepo
}

// NewAdminHandlers 创建管理后台处理器
func NewAdminHandlers(
	authService *AuthService,
	adminRepo *repository.AdminRepo,
	whitelistRepo *repository.WhitelistRepo,
	blacklistRepo *repository.BlacklistRepo,
	configRepo *repository.ConfigRepo,
	captchaRepo *repository.CaptchaRepo,
) *AdminHandlers {
	return &AdminHandlers{
		authService:   authService,
		adminRepo:     adminRepo,
		whitelistRepo: whitelistRepo,
		blacklistRepo: blacklistRepo,
		configRepo:    configRepo,
		captchaRepo:   captchaRepo,
	}
}

// ShowLoginPage 显示登录页面
func (h *AdminHandlers) ShowLoginPage(c *gin.Context) {
	c.HTML(http.StatusOK, "login.html", gin.H{
		"title": "CaptchaX Admin Login",
	})
}

// ShowDashboardPage 显示仪表盘页面
func (h *AdminHandlers) ShowDashboardPage(c *gin.Context) {
	c.HTML(http.StatusOK, "dashboard.html", gin.H{
		"title": "CaptchaX Admin Dashboard",
	})
}

// ShowStatsPage 显示统计页面
func (h *AdminHandlers) ShowStatsPage(c *gin.Context) {
	c.HTML(http.StatusOK, "stats.html", gin.H{
		"title": "CaptchaX Admin Statistics",
	})
}

// ShowConfigPage 显示配置页面
func (h *AdminHandlers) ShowConfigPage(c *gin.Context) {
	c.HTML(http.StatusOK, "config.html", gin.H{
		"title": "CaptchaX Admin Configuration",
	})
}

// ShowWhitelistPage 显示白名单页面
func (h *AdminHandlers) ShowWhitelistPage(c *gin.Context) {
	c.HTML(http.StatusOK, "whitelist.html", gin.H{
		"title": "CaptchaX Admin Whitelist",
	})
}

// ShowBlacklistPage 显示黑名单页面
func (h *AdminHandlers) ShowBlacklistPage(c *gin.Context) {
	c.HTML(http.StatusOK, "blacklist.html", gin.H{
		"title": "CaptchaX Admin Blacklist",
	})
}

// Login 登录
func (h *AdminHandlers) Login(c *gin.Context) {
	var req model.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}

	resp, err := h.authService.Login(c, &req)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, err.Error())
		return
	}

	response.Success(c, resp)
}

// Logout 登出
func (h *AdminHandlers) Logout(c *gin.Context) {
	response.SuccessWithMessage(c, "logged out successfully", nil)
}

// GetDashboard 获取仪表盘数据
func (h *AdminHandlers) GetDashboard(c *gin.Context) {
	ctx := c.Request.Context()
	now := time.Now()

	stats := make(map[string]interface{})

	// 获取今日统计
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	yesterdayStart := todayStart.AddDate(0, 0, -1)
	todayStats, err := h.captchaRepo.GetStats(ctx, todayStart, now)
	if err == nil {
		stats["today_verifications"] = todayStats.Total
		stats["success_rate"] = calculateSuccessRate(todayStats)
	}

	// 获取昨日统计用于对比
	yesterdayStats, err := h.captchaRepo.GetStats(ctx, yesterdayStart, todayStart)
	if err == nil {
		stats["yesterday_verifications"] = yesterdayStats.Total
		stats["verifications_change"] = calculateChange(todayStats.Total, yesterdayStats.Total)
	}

	// 获取7天统计
	weekStart := now.AddDate(0, 0, -7)
	weekStats, err := h.captchaRepo.GetStats(ctx, weekStart, now)
	if err == nil {
		stats["captcha_stats"] = weekStats
		stats["blocked_attacks"] = weekStats.Rejected
	}

	// 获取白名单、黑名单、管理员数量
	whitelistCount, err := h.whitelistRepo.Count(ctx)
	if err == nil {
		stats["whitelist_count"] = whitelistCount
	}

	blacklistCount, err := h.blacklistRepo.Count(ctx, false)
	if err == nil {
		stats["blacklist_count"] = blacklistCount
	}

	adminCount, err := h.adminRepo.Count(ctx)
	if err == nil {
		stats["admin_count"] = adminCount
	}

	// 获取活跃用户数
	activeUsers, err := h.captchaRepo.CountUniqueIPs(ctx, weekStart, now)
	if err == nil {
		stats["active_users"] = activeUsers
	}

	// 获取系统配置
	sysConfig, err := h.configRepo.GetSystemConfig(ctx)
	if err == nil {
		stats["system_config"] = sysConfig
	}

	// 获取最近日志
	recentLogs, err := h.captchaRepo.List(ctx, &model.CaptchaLogFilter{
		Page:     1,
		PageSize: 10,
	})
	if err == nil {
		logs := make([]*model.CaptchaLogDTO, 0, len(recentLogs))
		for _, log := range recentLogs {
			logs = append(logs, log.ToDTO())
		}
		stats["recent_logs"] = logs
	}

	// 管理员信息
	stats["admin_id"] = h.authService.GetAdminID(c)
	stats["username"] = h.authService.GetUsername(c)
	stats["role"] = h.authService.GetRole(c)

	response.Success(c, stats)
}

// GetStats 获取统计数据
func (h *AdminHandlers) GetStats(c *gin.Context) {
	ctx := c.Request.Context()

	period := c.DefaultQuery("period", "7d")
	var startDate time.Time
	now := time.Now()

	switch period {
	case "24h":
		startDate = now.AddDate(0, 0, -1)
	case "7d":
		startDate = now.AddDate(0, 0, -7)
	case "30d":
		startDate = now.AddDate(0, 0, -30)
	case "90d":
		startDate = now.AddDate(0, 0, -90)
	default:
		startDate = now.AddDate(0, 0, -7)
	}

	stats, err := h.captchaRepo.GetStats(ctx, startDate, now)
	if err != nil {
		response.InternalError(c, "failed to get stats")
		return
	}

	whitelistCount, _ := h.whitelistRepo.Count(ctx)
	blacklistCount, _ := h.blacklistRepo.Count(ctx, true)

	// 获取趋势数据
	trend, err := h.captchaRepo.GetTrend(ctx, startDate, now)
	if err != nil {
		trend = []model.TrendPoint{}
	}

	// 获取验证码类型分布
	distribution, err := h.captchaRepo.GetTypeDistribution(ctx, startDate, now)
	if err != nil {
		distribution = []model.TypeDistribution{}
	}

	// 获取IP排行
	ipRanking, err := h.captchaRepo.GetIPRanking(ctx, startDate, now, 20)
	if err != nil {
		ipRanking = []model.IPRanking{}
	}

	response.Success(c, gin.H{
		"period":             period,
		"start_date":         startDate.Format(time.RFC3339),
		"end_date":           now.Format(time.RFC3339),
		"captcha_stats":      stats,
		"whitelist_count":    whitelistCount,
		"blacklist_count":    blacklistCount,
		"trend":              trend,
		"captcha_distribution": distribution,
		"ip_ranking":         ipRanking,
	})
}

// GetTrend 获取趋势数据
func (h *AdminHandlers) GetTrend(c *gin.Context) {
	ctx := c.Request.Context()

	hoursStr := c.DefaultQuery("hours", "24")
	hours, err := strconv.Atoi(hoursStr)
	if err != nil || hours <= 0 {
		hours = 24
	}

	now := time.Now()
	startDate := now.Add(time.Duration(-hours) * time.Hour)

	trend, err := h.captchaRepo.GetTrend(ctx, startDate, now)
	if err != nil {
		response.InternalError(c, "failed to get trend data")
		return
	}

	response.Success(c, gin.H{
		"trend": trend,
	})
}

// GetCaptchaDistribution 获取验证码类型分布
func (h *AdminHandlers) GetCaptchaDistribution(c *gin.Context) {
	ctx := c.Request.Context()

	daysStr := c.DefaultQuery("days", "30")
	days, err := strconv.Atoi(daysStr)
	if err != nil || days <= 0 {
		days = 30
	}

	now := time.Now()
	startDate := now.AddDate(0, 0, -days)

	distribution, err := h.captchaRepo.GetTypeDistribution(ctx, startDate, now)
	if err != nil {
		response.InternalError(c, "failed to get distribution data")
		return
	}

	response.Success(c, distribution)
}

// GetIPRanking 获取IP排行
func (h *AdminHandlers) GetIPRanking(c *gin.Context) {
	ctx := c.Request.Context()

	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 20
	}

	daysStr := c.DefaultQuery("days", "30")
	days, err := strconv.Atoi(daysStr)
	if err != nil || days <= 0 {
		days = 30
	}

	now := time.Now()
	startDate := now.AddDate(0, 0, -days)

	ranking, err := h.captchaRepo.GetIPRanking(ctx, startDate, now, limit)
	if err != nil {
		response.InternalError(c, "failed to get IP ranking")
		return
	}

	// 添加状态信息
	for i := range ranking {
		ip := ranking[i].IP
		isWhitelisted, _ := h.whitelistRepo.Exists(ctx, ip)
		isBlacklisted, _ := h.blacklistRepo.Exists(ctx, ip)

		switch {
		case isWhitelisted:
			ranking[i].Status = "whitelisted"
		case isBlacklisted:
			ranking[i].Status = "blocked"
		case ranking[i].SuccessRate < 50:
			ranking[i].Status = "suspicious"
		default:
			ranking[i].Status = "normal"
		}
	}

	response.Success(c, ranking)
}

// GetConfig 获取配置
func (h *AdminHandlers) GetConfig(c *gin.Context) {
	ctx := c.Request.Context()

	configs, err := h.configRepo.List(ctx)
	if err != nil {
		response.InternalError(c, "failed to get config")
		return
	}

	dtos := make([]*model.ConfigDTO, 0, len(configs))
	for _, cfg := range configs {
		dtos = append(dtos, cfg.ToDTO())
	}

	response.Success(c, gin.H{
		"configs": dtos,
	})
}

// UpdateConfig 更新配置
func (h *AdminHandlers) UpdateConfig(c *gin.Context) {
	var req model.UpdateConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}

	ctx := c.Request.Context()

	existingCfg, err := h.configRepo.Get(ctx, req.Key)
	if err != nil {
		response.InternalError(c, "failed to check config")
		return
	}

	if existingCfg == nil {
		response.NotFound(c, "config key not found")
		return
	}

	if err := h.configRepo.Update(ctx, req.Key, req.Value); err != nil {
		response.InternalError(c, "failed to update config")
		return
	}

	response.SuccessWithMessage(c, "config updated successfully", nil)
}

// GetWhitelist 获取白名单
func (h *AdminHandlers) GetWhitelist(c *gin.Context) {
	ctx := c.Request.Context()

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	ip := c.Query("ip")
	domain := c.Query("domain")

	filter := &model.WhitelistFilter{
		IP:       ip,
		Domain:   domain,
		Page:     page,
		PageSize: pageSize,
	}

	entries, err := h.whitelistRepo.List(ctx, filter)
	if err != nil {
		response.InternalError(c, "failed to get whitelist")
		return
	}

	total, err := h.whitelistRepo.Count(ctx)
	if err != nil {
		total = 0
	}

	dtos := make([]*model.WhitelistDTO, 0, len(entries))
	for _, entry := range entries {
		dtos = append(dtos, entry.ToDTO())
	}

	response.Success(c, gin.H{
		"items":       dtos,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": (total + int64(pageSize) - 1) / int64(pageSize),
	})
}

// AddWhitelist 添加白名单
func (h *AdminHandlers) AddWhitelist(c *gin.Context) {
	var req model.CreateWhitelistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}

	ctx := c.Request.Context()

	entry := &model.Whitelist{
		IP: req.IP,
	}
	if req.Domain != "" {
		entry.Domain = sql.NullString{String: req.Domain, Valid: true}
	}
	if req.Reason != "" {
		entry.Reason = sql.NullString{String: req.Reason, Valid: true}
	}

	id, err := h.whitelistRepo.Create(ctx, entry)
	if err != nil {
		response.Error(c, http.StatusConflict, err.Error())
		return
	}

	response.Success(c, gin.H{"id": id})
}

// DeleteWhitelist 删除白名单
func (h *AdminHandlers) DeleteWhitelist(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	ctx := c.Request.Context()

	entry, err := h.whitelistRepo.GetByID(ctx, id)
	if err != nil {
		response.InternalError(c, "failed to check whitelist")
		return
	}
	if entry == nil {
		response.NotFound(c, "whitelist entry not found")
		return
	}

	if err := h.whitelistRepo.Delete(ctx, id); err != nil {
		response.InternalError(c, "failed to delete whitelist")
		return
	}

	response.SuccessWithMessage(c, "whitelist entry deleted", nil)
}

// GetBlacklist 获取黑名单
func (h *AdminHandlers) GetBlacklist(c *gin.Context) {
	ctx := c.Request.Context()

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	ip := c.Query("ip")
	activeOnly := c.Query("active_only") == "true"

	filter := &model.BlacklistFilter{
		IP:         ip,
		ActiveOnly: activeOnly,
		Page:       page,
		PageSize:   pageSize,
	}

	entries, err := h.blacklistRepo.List(ctx, filter)
	if err != nil {
		response.InternalError(c, "failed to get blacklist")
		return
	}

	total, err := h.blacklistRepo.Count(ctx, false)
	if err != nil {
		total = 0
	}

	dtos := make([]*model.BlacklistDTO, 0, len(entries))
	for _, entry := range entries {
		dtos = append(dtos, entry.ToDTO())
	}

	response.Success(c, gin.H{
		"items":       dtos,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": (total + int64(pageSize) - 1) / int64(pageSize),
	})
}

// AddBlacklist 添加黑名单
func (h *AdminHandlers) AddBlacklist(c *gin.Context) {
	var req model.CreateBlacklistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}

	ctx := c.Request.Context()

	entry := &model.Blacklist{
		IP: req.IP,
	}
	if req.Reason != "" {
		entry.Reason = sql.NullString{String: req.Reason, Valid: true}
	}
	if req.ExpireAt != nil {
		entry.ExpireAt = sql.NullTime{Time: *req.ExpireAt, Valid: true}
	}

	id, err := h.blacklistRepo.Create(ctx, entry)
	if err != nil {
		response.InternalError(c, "failed to add blacklist")
		return
	}

	response.Success(c, gin.H{"id": id})
}

// DeleteBlacklist 删除黑名单
func (h *AdminHandlers) DeleteBlacklist(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	ctx := c.Request.Context()

	entry, err := h.blacklistRepo.GetByID(ctx, id)
	if err != nil {
		response.InternalError(c, "failed to check blacklist")
		return
	}
	if entry == nil {
		response.NotFound(c, "blacklist entry not found")
		return
	}

	if err := h.blacklistRepo.Delete(ctx, id); err != nil {
		response.InternalError(c, "failed to delete blacklist")
		return
	}

	response.SuccessWithMessage(c, "blacklist entry deleted", nil)
}

// 辅助函数：计算成功率
func calculateSuccessRate(stats *model.CaptchaStats) float64 {
	if stats.Total == 0 {
		return 0
	}
	return (float64(stats.Verified) / float64(stats.Total)) * 100
}

// 辅助函数：计算变化百分比
func calculateChange(current, previous int64) float64 {
	if previous == 0 {
		if current > 0 {
			return 100.0
		}
		return 0
	}
	return (float64(current-previous) / float64(previous)) * 100
}
