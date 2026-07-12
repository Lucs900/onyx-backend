export async function POST(request) {
  try {
    const { message } = await request.json();
    // Test static response
    return Response.json({ reply: "Test successful! ONYX is connected. Tell me about your California home for equity options." });
  } catch (error) {
    return Response.json({ reply: "Sorry, server error." }, { status: 500 });
  }
}
