export interface InputLink {
  id: string
  source: string
  url: string
  metadata?: Record<string, any>
  createdAt?: number
  updatedAt?: number
}

export interface InputLinkResult {
  success: boolean
  link?: InputLink
  error?: string
}

export class InputLinkHandler {
  private links = new Map<string, InputLink>()

  register(link: InputLink): InputLinkResult {
    if (this.links.has(link.id)) {
      return { success: false, error: `Link with id "${link.id}" already exists.` }
    }
    const now = Date.now()
    const newLink: InputLink = { ...link, createdAt: now, updatedAt: now }
    this.links.set(link.id, newLink)
    return { success: true, link: newLink }
  }

  get(id: string): InputLinkResult {
    const link = this.links.get(id)
    if (!link) {
      return { success: false, error: `No link found for id "${id}".` }
    }
    return { success: true, link }
  }

  list(): InputLink[] {
    return Array.from(this.links.values())
  }

  update(id: string, updates: Partial<Omit<InputLink, "id">>): InputLinkResult {
    const link = this.links.get(id)
    if (!link) {
      return { success: false, error: `Cannot update: no link found for id "${id}".` }
    }
    const updated: InputLink = { ...link, ...updates, updatedAt: Date.now() }
    this.links.set(id, updated)
    return { success: true, link: updated }
  }

  unregister(id: string): boolean {
    return this.links.delete(id)
  }

  clear(): void {
    this.links.clear()
  }

  exists(id: string): boolean {
    return this.links.has(id)
  }

  findBySource(source: string): InputLink[] {
    return Array.from(this.links.values()).filter(link => link.source === source)
  }
}
