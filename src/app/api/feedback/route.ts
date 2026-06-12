import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, category, message, source } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: '缺少必填字段：name, email, message' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    // Here you would typically save to database
    // For now, we'll log and return success
    console.log(`[Feedback] Name: ${name}, Email: ${email}, Category: ${category || 'general'}, Source: ${source || 'unknown'}`);
    console.log(`[Feedback] Message: ${message.substring(0, 200)}...`);

    // Simulate async DB write
    await new Promise(resolve => setTimeout(resolve, 100));

    return NextResponse.json({
      success: true,
      message: '反馈已提交，感谢您的意见！',
    }, { status: 201 });
  } catch (error) {
    console.error('[Feedback] Error:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // For now, return empty list. Can be extended to list all feedback.
  return NextResponse.json({ feedbacks: [], total: 0 });
}
