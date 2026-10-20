export type CompanyStatus = { active: boolean; expires_at: string | null; archived_at?: string | null; suspension_message?: string | null };

export function companyAvailable(company: CompanyStatus) {
  return !company.archived_at && company.active && (!company.expires_at || company.expires_at >= new Date().toISOString().slice(0, 10));
}

export function companySuspensionMessage(company: CompanyStatus) {
  return company.suspension_message?.trim() || "تواصل مع مزوّد النظام لتجديد الاشتراك.";
}