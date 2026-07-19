export const emptyVacancy = () => ({
  id: crypto.randomUUID(),
  updatedAt: Date.now(),
  status: "draft",
  rejectReason: null,
  showsPurchased: 0,
  showsUsed: 0,
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

export function vacancyFromRow(row) {
  return {
    ...row.data,
    id: row.id,
    updatedAt: new Date(row.updated_at).getTime(),
    status: row.status,
    rejectReason: row.reject_reason,
    showsPurchased: row.shows_purchased,
    showsUsed: row.shows_used,
    isPaid: row.is_paid,
    listingPrice: row.listing_price,
    pricePerShow: row.price_per_show,
    template: row.template,
  };
}
