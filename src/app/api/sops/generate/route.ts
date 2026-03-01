import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic()

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['owner', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { description } = await request.json() as { description?: string }

    if (!description?.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system:
        'You are an expert SOP writer for businesses. Respond ONLY with valid JSON — no markdown code blocks, no explanation, no extra text.',
      messages: [
        {
          role: 'user',
          content: `Convert this process description into a Standard Operating Procedure:

${description.trim()}

Return a JSON object with this exact shape:
{
  "title": "string (concise SOP title)",
  "description": "string (1-2 sentence summary of what this SOP covers)",
  "steps": [
    {
      "position": 1,
      "step_type": "instruction",
      "title": "string (short action phrase, e.g. 'Unlock the front door')",
      "content": "string (clear, detailed instructions for this step)",
      "image_url": "",
      "video_url": ""
    }
  ]
}

Rules:
- step_type must be "instruction", "video", or "acknowledgement"
- Use "acknowledgement" for safety warnings, legal notices, or anything the employee must explicitly confirm they understand
- Use "video" only if the description mentions a specific video URL — and put that URL in video_url
- Use "instruction" for all other steps
- Aim for 4–10 steps; more steps are better than vague ones
- Step titles must be short action phrases (5 words max)
- Content should be specific and actionable — not vague
- image_url and video_url are always empty strings unless video_url applies
- Return ONLY the JSON object, nothing else`,
        },
      ],
    })

    const raw = message.content[0]
    if (raw.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response from AI' }, { status: 500 })
    }

    // Strip markdown code fences if the model wrapped the JSON anyway
    const cleaned = raw.text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('Raw AI response:', raw.text)
      return NextResponse.json(
        { error: 'AI returned invalid JSON. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json(parsed)
  } catch (error: unknown) {
    console.error('AI SOP generation error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
