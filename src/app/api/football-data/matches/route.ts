import { NextResponse } from "next/server";

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const BASE_URL = "https://api.football-data.org/v4";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const status = searchParams.get("status");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    if (!API_KEY) {
        console.warn("Warning: FOOTBALL_DATA_API_KEY is missing in environment variables.");
    }

    let url = "";
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (dateFrom) params.append("dateFrom", dateFrom);
    if (dateTo) params.append("dateTo", dateTo);

    if (code) {
        url = `${BASE_URL}/competitions/${code}/matches`;
    } else {
        // Global matches endpoint
        url = `${BASE_URL}/matches`;
    }

    if (params.toString()) {
        url += `?${params.toString()}`;
    }

    console.log(`Fetching matches from: ${url} | Key present: ${!!API_KEY}`);

    try {
        const response = await fetch(url, {
            headers: {
                "X-Auth-Token": API_KEY || "",
            },
            next: { revalidate: 15 }, // Cache for 15s to protect rate limit
        });

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json({ error: errorData.message || "Failed to fetch matches" }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
