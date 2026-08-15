// Cloudflare Worker - GitHub OAuth 代理
// 部署: npx wrangler deploy

export interface Env {
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
  REDIRECT_URI: string
  ALLOWED_USER: string
  CMS_ORIGIN: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': env.CMS_ORIGIN || '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      })
    }

    // OAuth 回调（兼容 /callback 和 /auth/callback）
    if (url.pathname === '/callback' || url.pathname === '/auth/callback') {
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      const error = url.searchParams.get('error')

      if (error) {
        return Response.redirect(`${env.CMS_ORIGIN}/auth/callback#error=${encodeURIComponent(error)}`, 302)
      }

      if (!code) {
        return new Response('Missing code parameter', { status: 400 })
      }

      try {
        // 交换 access_token
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: env.REDIRECT_URI,
          }),
        })

        if (!tokenRes.ok) {
          return Response.redirect(`${env.CMS_ORIGIN}/auth/callback#error=token_exchange_failed`, 302)
        }

        const tokenData = await tokenRes.json() as { access_token?: string; error?: string }

        if (tokenData.error || !tokenData.access_token) {
          return Response.redirect(`${env.CMS_ORIGIN}/auth/callback#error=${encodeURIComponent(tokenData.error || 'no_token')}`, 302)
        }

        // 验证用户身份
        const userRes = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        })

        if (!userRes.ok) {
          return Response.redirect(`${env.CMS_ORIGIN}/auth/callback#error=user_fetch_failed`, 302)
        }

        const user = await userRes.json() as { login: string }

        if (user.login !== env.ALLOWED_USER) {
          return new Response(
            `Access Denied: Only the site owner (${env.ALLOWED_USER}) can access this CMS. Your login: ${user.login}`,
            { status: 403 }
          )
        }

        // 验证通过，返回 token
        const redirectUrl = new URL(`${env.CMS_ORIGIN}/auth/callback`)
        redirectUrl.hash = `access_token=${tokenData.access_token}`
        return Response.redirect(redirectUrl.toString(), 302)

      } catch (e: any) {
        return Response.redirect(`${env.CMS_ORIGIN}/auth/callback#error=${encodeURIComponent(e.message)}`, 302)
      }
    }

    // 健康检查（兼容 /health 和 /auth/health）
    if (url.pathname === '/health' || url.pathname === '/auth/health') {
      return new Response('OK', { status: 200 })
    }

    return new Response('Not Found', { status: 404 })
  },
}