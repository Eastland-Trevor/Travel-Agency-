import { type ActionFunctionArgs, data } from "react-router";
import OpenAI from "openai";

import { parseMarkdownToJson, parseTripData } from "~/lib/utils";

import { appwriteConfig, database } from "~/appwrite/client";

import { ID } from "appwrite";

import { createProduct } from "~/lib/stripe";

export const action = async ({ request }: ActionFunctionArgs) => {
  const {
    country,
    numberOfDays,
    travelStyle,
    interests,
    budget,
    groupType,
    userId,
  } = await request.json();

  // GROQ CLIENT
  const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });

  const unsplashApiKey = process.env.UNSPLASH_ACCESS_KEY!;

  try {
    const prompt = `
Generate a ${numberOfDays}-day travel itinerary for ${country} based on the following user information:

Budget: '${budget}'
Interests: '${interests}'
TravelStyle: '${travelStyle}'
GroupType: '${groupType}'

Return ONLY valid JSON in this exact structure:

{
  "name": "A descriptive title for the trip",
  "description": "A brief description of the trip and its highlights not exceeding 100 words",
  "estimatedPrice": "$1200",
  "duration": ${numberOfDays},
  "budget": "${budget}",
  "travelStyle": "${travelStyle}",
  "country": "${country}",
  "interests": "${interests}",
  "groupType": "${groupType}",
  "bestTimeToVisit": [
    "🌸 Season (from month to month): reason to visit",
    "☀️ Season (from month to month): reason to visit",
    "🍁 Season (from month to month): reason to visit",
    "❄️ Season (from month to month): reason to visit"
  ],
  "weatherInfo": [
    "☀️ Season: temperature range in Celsius (temperature range in Fahrenheit)",
    "🌦️ Season: temperature range in Celsius (temperature range in Fahrenheit)",
    "🌧️ Season: temperature range in Celsius (temperature range in Fahrenheit)",
    "❄️ Season: temperature range in Celsius (temperature range in Fahrenheit)"
  ],
  "location": {
    "city": "name of the city or region",
    "coordinates": [0,0],
    "openStreetMap": "link"
  },
  "itinerary": [
    {
      "day": 1,
      "location": "City/Region Name",
      "activities": [
        {
          "time": "Morning",
          "description": "Activity description"
        },
        {
          "time": "Afternoon",
          "description": "Activity description"
        },
        {
          "time": "Evening",
          "description": "Activity description"
        }
      ]
    }
  ]
}
`;

    // GROQ AI REQUEST
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const responseText = completion.choices[0].message.content || "";

    // PARSE AI RESPONSE
    const trip = parseMarkdownToJson(responseText);

    // FETCH IMAGES FROM UNSPLASH
    const imageResponse = await fetch(
      `https://api.unsplash.com/search/photos?query=${country} ${interests} ${travelStyle}&client_id=${unsplashApiKey}`,
    );

    if (!imageResponse.ok) {
      throw new Error("Failed to fetch images");
    }

    const imageData = await imageResponse.json();

    const imageUrls = imageData.results
      ?.slice(0, 3)
      ?.map((result: any) => result.urls?.regular || null)
      ?.filter(Boolean);

    // CREATE APPWRITE DOCUMENT
    const result = await database.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.tripCollectionId,
      ID.unique(),
      {
        tripDetails: JSON.stringify(trip),
        createdAt: new Date().toISOString(),
        imageUrls,
        userId,
      },
    );

    // PARSE TRIP DATA
    const tripDetail = parseTripData(result.tripDetails) as Trip;

    const tripPrice = parseInt(tripDetail.estimatedPrice.replace("$", ""), 10);

    // CREATE STRIPE PAYMENT LINK
    const paymentLink = await createProduct(
      tripDetail.name,
      tripDetail.description,
      imageUrls,
      tripPrice,
      result.$id,
    );

    // UPDATE DOCUMENT
    await database.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.tripCollectionId,
      result.$id,
      {
        payment_link: paymentLink.url,
      },
    );

    return data({
      id: result.$id,
    });
  } catch (e: any) {
    console.error("Error generating travel plan:", e);

    return data(
      {
        success: false,
        error: e?.message || "Failed to generate trip",
      },
      {
        status: 500,
      },
    );
  }
};
