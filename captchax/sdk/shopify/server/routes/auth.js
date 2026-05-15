const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const API_KEY = process.env.SHOPIFY_API_KEY;
const API_SECRET = process.env.SHOPIFY_API_SECRET;
const SCOPES = process.env.SHOPIFY_SCOPES || 'read_products, write_products';
const HOST = process.env.HOST || 'https://example.com';

router.get('/login', async (req, res) => {
  try {
    const shop = req.query.shop;
    
    if (!shop) {
      return res.status(400).json({ error: 'Shop parameter is required' });
    }

    if (!isValidShopDomain(shop)) {
      return res.status(400).json({ error: 'Invalid shop domain' });
    }

    const redirectUri = `${HOST}/auth/callback`;
    const state = crypto.randomBytes(16).toString('hex');
    
    res.cookie('shopify_auth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 900000
    });

    const authUrl = `https://${shop}/admin/oauth/authorize?` +
      `client_id=${API_KEY}&` +
      `scope=${SCOPES}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}&` +
      `grant_options[]=value`;

    res.json({ authUrl });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

router.get('/callback', async (req, res) => {
  try {
    const { shop, code, state } = req.query;
    const stateCookie = req.cookies?.shopify_auth_state;

    if (!state || state !== stateCookie) {
      return res.status(403).json({ error: 'Invalid state parameter' });
    }

    if (!isValidShopDomain(shop)) {
      return res.status(400).json({ error: 'Invalid shop domain' });
    }

    const accessToken = await exchangeCodeForToken(shop, code);
    
    res.clearCookie('shopify_auth_state');
    res.cookie('shopify_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 86400000
    });

    res.redirect(`/admin?shop=${shop}`);
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

router.get('/token', async (req, res) => {
  try {
    const shop = req.query.shop;
    const token = req.cookies?.shopify_access_token;

    if (!shop || !token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    res.json({ token, shop });
  } catch (error) {
    console.error('Token check error:', error);
    res.status(500).json({ error: 'Token verification failed' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('shopify_access_token');
  res.json({ success: true });
});

function isValidShopDomain(shop) {
  const regex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/;
  return regex.test(shop);
}

async function exchangeCodeForToken(shop, code) {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: API_KEY,
      client_secret: API_SECRET,
      code
    })
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for access token');
  }

  const data = await response.json();
  return data.access_token;
}

module.exports = router;
