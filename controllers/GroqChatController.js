import Groq from "groq-sdk";

export const chatWithGroq = async (req, res) => {
  try {
    // 🔥 Buat client DI DALAM function
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ msg: "Message is required" });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "Kamu adalah asisten AI yang ahli dalam budidaya ikan, perikanan, dan kesehatan ikan.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    res.json({
      reply: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("Groq error:", error);
    res.status(500).json({ msg: "Chatbot error" });
  }
};
