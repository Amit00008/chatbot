import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid messages format. Expected a non-empty array." },
        { status: 400 }
      );
    }

    // Validate GROQ_API_KEY exists
    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY is not set in environment variables");
      return NextResponse.json(
        { error: "Server configuration error: API key missing" },
        { status: 500 }
      );
    }

    // Clean messages: ONLY role and content (Groq requirement)
    const validRoles = ["user", "assistant", "system"];
    const cleanMessages = messages
      .map((m) => {
        // Extract role and content, handling various formats
        const role = m.role?.toLowerCase()?.trim();
        const content = String(m.content || m.text || "").trim();

        // Validate role
        if (!role || !validRoles.includes(role)) {
          console.warn("Invalid role:", role, "in message:", m);
          return null;
        }

        // Validate content
        if (!content || content.length === 0) {
          console.warn("Empty content in message:", m);
          return null;
        }

        // Return ONLY role and content (no other properties)
        return {
          role: role,
          content: content,
        };
      })
      .filter((m) => m !== null); // Remove invalid messages

    if (cleanMessages.length === 0) {
      console.error(
        "No valid messages after cleaning. Original messages:",
        messages
      );
      return NextResponse.json(
        {
          error:
            "No valid messages provided. Messages must have valid role (user/assistant/system) and non-empty content.",
        },
        { status: 400 }
      );
    }

    // Log cleaned messages for debugging (first 2 only to avoid spam)
    console.log(
      "Cleaned messages (first 2):",
      cleanMessages.slice(0, 2).map((m) => ({ role: m.role, contentLength: m.content.length }))
    );

    // Call Groq API
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: cleanMessages,
        max_completion_tokens: 1024,
      }),
    });

    // Handle Groq API errors (Groq returns { error: { message: string } } or { message: string })
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      const groqMessage =
        errorData?.error?.message || errorData?.message || errorText || response.statusText ||
        "Unknown error";
      console.error("Groq API error:", response.status, errorData);
      return NextResponse.json(
        {
          error: `Groq API error: ${groqMessage}`,
        },
        {
          status:
            response.status >= 400 && response.status < 500 ? response.status : 500,
        }
      );
    }

    // Parse successful response
    const data = await response.json();

    // Validate response structure
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      console.error("Invalid Groq response structure:", data);
      return NextResponse.json(
        { error: "Invalid response from Groq API" },
        { status: 500 }
      );
    }

    const assistantMessage = data.choices[0].message;
    if (!assistantMessage || !assistantMessage.content) {
      console.error("Invalid message in Groq response:", assistantMessage);
      return NextResponse.json(
        { error: "Invalid message format from Groq API" },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({
      message: assistantMessage,
      usage: data.usage || null,
    });
  } catch (error) {
    // Log full error for debugging
    console.error("Unexpected error in chat route:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
