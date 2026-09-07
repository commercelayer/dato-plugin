import { useEffect, useState } from 'react'
import CommerceLayerClient from './CommerceLayerClient'
import { jwtDecode } from '@commercelayer/js-auth'

/**
 * Resolves the organization dashboard link out of the access token.
 * Returns `null` until the token has been fetched (or if it can't be fetched).
 */
export default function useDashboardLink(client: CommerceLayerClient) {
  const [dashboardLink, setDashboardLink] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    setDashboardLink(null)

    client
      .getToken()
      .then((accessToken) => {
        const { payload } = jwtDecode(accessToken)
        if (!('organization' in payload)) {
          throw new Error('Invalid access token: missing organization data.')
        }
        const { hostname } = new URL(payload.iss)
        const slug = payload.organization.slug
        const environment = payload.test ? 'test' : 'live'
        const domain = hostname.split('.').slice(-2).join('.')

        const dashboardLink = `https://dashboard.${domain}/${environment}/${slug}`
        setDashboardLink(dashboardLink)
      })
      .catch(() => {
        if (!cancelled) {
          setDashboardLink(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [client])

  return dashboardLink
}
