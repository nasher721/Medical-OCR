import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const { url, secret } = await request.json();

    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'MedOCR-Webhook-Tester/1.0',
                ...(secret ? { 'X-Webhook-Secret': secret } : {}),
            },
            body: JSON.stringify({
                event: 'ping',
                timestamp: new Date().toISOString(),
                message: 'This is a test event from MedOCR.',
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        return NextResponse.json({
            success: response.ok,
            status: response.status,
            message: response.ok ? 'Webhook delivered successfully' : `Webhook failed with status ${response.status}`,
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            status: 0,
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
