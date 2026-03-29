export type UserRole = 'admin' | 'coordinador' | 'editor';

// --- Granular permissions (Correction 10) ---
export type PermissionModule =
  | 'dashboard'
  | 'temas'
  | 'ofertas'
  | 'usuarios'
  | 'multimedia'
  | 'referencias'
  | 'identidades'
  | 'configuracion';

export type PermissionAction = 'ver' | 'crear' | 'editar' | 'eliminar' | 'publicar';

/** Each module maps to its allowed actions (true = granted). */
export type UserPermissions = {
  [M in PermissionModule]: {
    [A in PermissionAction]?: boolean;
  };
};

// --- Sales access (Correction 13) ---
export type SalesAccessLevel = 'solo_lectura' | 'lectura_escritura' | 'admin_ventas';

export interface SalesAccess {
  enabled: boolean;
  level: SalesAccessLevel;
  regions: string[];
  discountLimit: number; // percentage 0-100
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  username: string;
  password?: string;
  phone?: string;
  permissions?: UserPermissions;
  salesAccess?: SalesAccess;
}

export interface AuditLogEntry {
  id: number;
  user_id: string;
  user_name: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}

export type OfferType = 'diplomado' | 'curso';

export interface Offer {
  id: string;
  name: string;
  type: OfferType;
  institution: string;
  description: string;
  edition?: string;
  authors?: string;
  audience?: string;
  modality?: 'eLearning' | 'bLearning' | 'presencial';
  duration?: string;
  prereqs?: string;
  purpose?: string;
  identityId?: string;
  modules: Module[];
  order?: number;
}

export interface Module {
  id: string;
  offerId: string;
  name: string;
  description: string;
  objectives?: string;
  topics: Topic[];
  assignedEditors: string[];
  order: number;
}

export type TopicStatus = 'en_desarrollo' | 'en_revision' | 'aprobado' | 'devuelto';

export interface Topic {
  id: string;
  moduleId: string;
  offerId: string;
  title: string;
  description: string;
  status: TopicStatus;
  author: string;
  version: string;
  date: string;
  offerName: string;
  content: string;
  blocks: ContentBlock[];
  referenceIds: string[];
  assignedEditors: string[];
  templateId?: string;
  order?: number;
}

export interface ContentBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'image' | 'callout' | 'list' | 'table' | 'references' | 'section';
  content: string;
  level?: number;
  variant?: string;
  imageUrl?: string;
  imageScale?: number;
  caption?: string;
  items?: string[];
  order: number;
  sectionTitle?: string;
}

export type ReferenceStyle = 'apa' | 'vancouver';

export interface BibliographyReference {
  id: string;
  style: ReferenceStyle;
  authors: string;
  title: string;
  year: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  city?: string;
  doi?: string;
  url?: string;
  accessDate?: string;
  edition?: string;
  chapter?: string;
  editors?: string;
  type: 'article' | 'book' | 'chapter' | 'website' | 'thesis' | 'conference';
  offerId?: string;
  moduleTag?: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  type: OfferType;
  sections: TemplateSection[];
  isDefault: boolean;
  createdBy: string;
}

export interface TemplateSection {
  id: string;
  title: string;
  description: string;
  order: number;
  subsections?: TemplateSection[];
  required: boolean;
}

export interface MediaAsset {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'document';
  description: string;
  uploadedBy: string;
  uploadedAt: string;
  size: number;
  folderId?: string;
  offerId?: string;
}

export interface RepositoryFolder {
  id: string;
  name: string;
  parentId: string | null;
  accessRoles: UserRole[];
  offerId?: string;
}

export interface IdentityBlock {
  id: string;
  name: string;
  html: string;
  detectedTypes?: string[];
}

export interface CorporateIdentity {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  logoNegativeUrl?: string;
  colorPrimary: string;
  colorSecondary: string;
  colorTertiary: string;
  colorBackground: string;
  colorTextPrimary: string;
  colorButtons: string;
  colorButtonsHover: string;
  fontPrimaryName?: string;
  fontPrimaryFamily?: string;
  fontPrimaryImportUrl?: string;
  fontSecondaryName?: string;
  fontSecondaryFamily?: string;
  buttonStyle?: string;
  borderRadius?: string;
  snippet?: string;
  detectedBlocks?: string[];
  blocks?: IdentityBlock[];
}
