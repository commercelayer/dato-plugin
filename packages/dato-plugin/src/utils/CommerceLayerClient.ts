import { authenticate, getCoreApiBaseEndpoint } from '@commercelayer/js-auth'
import qs from 'qs'
import { ValidConfig } from '../types'

export type Product = {
  id: string
  attributes: {
    image_url: string
    name: string
    code: string
    description: string
  }
}

export default class CommerceLayerClient {
  clientId: string
  clientSecret: string
  token: string | null

  constructor({
    clientId,
    clientSecret,
  }: Pick<ValidConfig, 'clientId' | 'clientSecret'>) {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.token = null
  }

  async productsMatching(query: string): Promise<Product[]> {
    const result = await this.get('/api/skus', {
      'filter[q][code_or_name_or_description_cont]': query,
      'page[size]': 24,
    })

    return result.data
  }

  async productByCode(code: string): Promise<Product> {
    const result = await this.get('/api/skus', {
      'filter[q][code_eq]': code,
    })

    if (result.data.length === 0) {
      throw new Error('Missing SKU')
    }

    return result.data[0]
  }

  async getToken() {
    if (this.token) {
      return this.token
    }

    const { accessToken } = await authenticate('client_credentials', {
      clientId: this.clientId,
      clientSecret: this.clientSecret,
    })

    if (!accessToken) {
      throw new Error('Could not retrieve an access token')
    }

    this.token = accessToken

    return this.token
  }

  /**
   * The organization base endpoint is derived from the access token itself:
   * the organization slug and the domain (`commercelayer.io` / `.co`) both come
   * from the JWT payload, so there's no need to ask the user for it.
   */
  async getBaseEndpoint() {
    const token = await this.getToken()

    return getCoreApiBaseEndpoint(token)
  }

  async get(path: string, filters = {}) {
    const token = await this.getToken()
    const baseEndpoint = await this.getBaseEndpoint()

    const response = await fetch(
      `${baseEndpoint}${path}${qs.stringify(filters, {
        addQueryPrefix: true,
      })}`,
      {
        headers: {
          accept: 'application/vnd.api+json',
          authorization: `Bearer ${token}`,
        },
      }
    )

    if (response.status !== 200) {
      throw new Error(`Invalid status code: ${response.status}`)
    }

    const contentType = response.headers.get('content-type')

    if (!contentType || !contentType.includes('application/vnd.api+json')) {
      throw new Error(`Invalid content type: ${contentType}`)
    }

    const body = await response.json()

    return body
  }
}
