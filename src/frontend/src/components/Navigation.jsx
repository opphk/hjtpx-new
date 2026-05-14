import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Navigation = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const [swipeStart, setSwipeStart] = useState(0);
  const drawerRef = useRef(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const handleOverlayClick = () => {
    setMobileMenuOpen(false);
  };

  const handleSwipeStart = (e) => {
    if (e.touches && e.touches.length === 1) {
      setSwipeStart(e.touches[0].clientX);
      setSwiping(true);
    }
  };

  const handleSwipeMove = (e) => {
    if (!swiping || !drawerRef.current) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - swipeStart;
    if (diff < 0) {
      const drawer = drawerRef.current;
      drawer.style.transform = `translateX(${Math.max(diff, 0)}px)`;
    }
  };

  const handleSwipeEnd = (e) => {
    if (!swiping) return;
    setSwiping(false);
    if (drawerRef.current) {
      drawerRef.current.style.transform = '';
      const endX = e.changedTouches[0].clientX;
      const diff = swipeStart - endX;
      if (diff > 80) {
        setMobileMenuOpen(false);
      }
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">
          <Link to="/dashboard">HJTPX 系统</Link>
        </div>

        <div className="navbar-menu">
          <Link
            to="/dashboard"
            className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
          >
            首页
          </Link>
          <Link
            to="/users"
            className={`nav-link ${location.pathname === '/users' ? 'active' : ''}`}
          >
            用户管理
          </Link>

          <div className="navbar-user">
            <span className="user-info">{user?.username}</span>
            <button onClick={handleLogout} className="btn btn-logout">
              退出
            </button>
          </div>
        </div>

        <button
          className="mobile-nav-toggle"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="打开菜单"
          aria-expanded={mobileMenuOpen}
        >
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </span>
        </button>
      </nav>

      {mobileMenuOpen && (
        <div
          className={`mobile-nav-overlay ${mobileMenuOpen ? 'active' : ''}`}
          onClick={handleOverlayClick}
        />
      )}

      <div
        ref={drawerRef}
        className={`mobile-nav-drawer ${mobileMenuOpen ? 'open' : ''}`}
        onTouchStart={handleSwipeStart}
        onTouchMove={handleSwipeMove}
        onTouchEnd={handleSwipeEnd}
        role="dialog"
        aria-modal="true"
        aria-label="移动端导航菜单"
      >
        <div className="mobile-nav-header">
          <span style={{ fontWeight: 600, fontSize: '18px' }}>菜单</span>
          <button
            className="mobile-nav-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="关闭菜单"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mobile-nav-links">
          <Link
            to="/dashboard"
            className={`mobile-nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: '12px' }}
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            首页
          </Link>
          <Link
            to="/users"
            className={`mobile-nav-link ${location.pathname === '/users' ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: '12px' }}
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            用户管理
          </Link>
        </div>

        <div className="mobile-nav-footer">
          <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
              {user?.username}
            </div>
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
              {user?.role === 'admin' ? '管理员' : '用户'}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-logout"
            style={{ width: '100%' }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: '8px' }}
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            退出登录
          </button>
        </div>
      </div>
    </>
  );
};

export default Navigation;
