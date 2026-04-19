export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'estimator';
  organizationId: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  organizationId: string;
  templateId?: string;
  currentVersionId?: string;
  currentVersion?: ProjectVersion;
  versions?: ProjectVersion[];
  updatedAt: string;
  createdAt: string;
  _count?: { versions: number };
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  version: number;
  label?: string;
  geometryJson: string;
  createdAt: string;
  estimations?: Estimation[];
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  preview?: string;
  geometryJson: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  category: ElementCategory;
  unit: Unit;
  unitPrice: number;
  description?: string;
  isSystem: boolean;
  organizationId?: string;
}

export interface Estimation {
  id: string;
  projectVersionId: string;
  totalAmount: number;
  discount: number;
  markup: number;
  notes?: string;
  items: EstimationItem[];
  createdAt: string;
  updatedAt: string;
}

export interface EstimationItem {
  id: string;
  estimationId: string;
  name: string;
  category: ElementCategory;
  unit: Unit;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  formula?: string;
  geometryRef?: string;
  catalogItemId?: string;
  sortOrder: number;
}

export type ElementType = 'wall' | 'floor' | 'roof' | 'window' | 'door' | 'foundation' | 'room';
export type ElementCategory = 'wall' | 'floor' | 'roof' | 'window' | 'door' | 'foundation' | 'engineering' | 'finishing' | 'other';
export type Unit = 'm2' | 'ml' | 'm3' | 'pcs' | 'hour';

export interface GeometryElement {
  id: string;
  type: ElementType;
  label?: string;
  // Wall specific
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  length?: number;
  height?: number;
  // Area elements
  x?: number;
  y?: number;
  width?: number;
  depth?: number;
  // Material override
  catalogItemId?: string;
}

export interface ProjectGeometry {
  width: number;
  height: number;
  elements: GeometryElement[];
}
