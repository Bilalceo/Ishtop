import { getApiBaseUrl } from "@/lib/runtime-config";

type JobListResponse = {
  jobs?: any[];
  total?: number;
  page?: number;
  page_size?: number;
  total_pages?: number;
};

export async function fetchDiscoveryJobs(kind: "cities" | "professions", slug: string): Promise<JobListResponse> {
  const base = getApiBaseUrl();
  const response = await fetch(`${base}/jobs/discovery/${kind}/${encodeURIComponent(slug)}?page=1&limit=24`, {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Discovery request failed (${response.status})`);
  }

  return response.json();
}

export async function fetchDiscoveryCompany(slug: string): Promise<any> {
  const base = getApiBaseUrl();
  const response = await fetch(`${base}/jobs/discovery/companies/${encodeURIComponent(slug)}?page=1&limit=24`, {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Company discovery request failed (${response.status})`);
  }

  return response.json();
}
