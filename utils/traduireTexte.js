export async function traduireTexte(texte, langueCible) {
  try {
    const reponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          {
            role: 'system',
            content: `Tu es un traducteur. Traduis le texte suivant dans la langue de code "${langueCible}". Reponds UNIQUEMENT avec la traduction, sans aucun commentaire ni guillemets.`,
          },
          { role: 'user', content: texte },
        ],
        temperature: 0.3,
      }),
    });
    const data = await reponse.json();
    return data.choices?.[0]?.message?.content?.trim() || texte;
  } catch (error) {
    console.log('Erreur traduction:', error);
    return texte;
  }
}
