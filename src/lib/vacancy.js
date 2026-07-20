export const emptyVacancy = () => ({
  id: crypto.randomUUID(),
  updatedAt: Date.now(),
  status: "draft",
  rejectReason: null,
  expiresAt: null,
  topUntil: null,
  isPaid: false,
  position: "",
  company: "",
  salary: "",
  city: "",
  employmentType: "",
  description: "",
  requirements: "",
  contact: "",
  tags: [],
  media: [],
  template: "minimal",
});

export const VACANCY_STATUS = {
  DRAFT: "draft",
  PENDING_REVIEW: "pending_review",
  APPROVED: "approved",
  REJECTED: "rejected",
  ACTIVE: "active",
  PAUSED: "paused",
};

export function isVacancyExpired(vacancy) {
  return Boolean(vacancy.expiresAt) && new Date(vacancy.expiresAt).getTime() <= Date.now();
}

export function isVacancyTop(vacancy) {
  return Boolean(vacancy.topUntil) && new Date(vacancy.topUntil).getTime() > Date.now();
}

export function vacancyFromRow(row) {
  return {
    ...row.data,
    id: row.id,
    updatedAt: new Date(row.updated_at).getTime(),
    status: row.status,
    rejectReason: row.reject_reason,
    expiresAt: row.expires_at,
    topUntil: row.top_until,
    isPaid: row.is_paid,
    template: row.template,
  };
}
