"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";

const GOOGLE_CLIENT_ID: any = process.env.GOOGLE_CLIENT_ID;
const Home = () => {
  const [steps, setSteps] = useState(0);
  const [error, setError] = useState("");
  const [weight, setweight] = useState([]);

  // Helper function to get the start and end of the current day in milliseconds
  function getTodayTimeRange() {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const endOfDay = startOfDay + 86400000; // Add 24 hours in milliseconds
    return { startTimeMillis: startOfDay, endTimeMillis: endOfDay };
  }

  async function fetchTodaySteps(accessToken: any) {
    const { startTimeMillis, endTimeMillis } = getTodayTimeRange();

    const response = await fetch(
      "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aggregateBy: [
            {
              dataTypeName: "com.google.step_count.delta",
            },
          ],
          bucketByTime: { durationMillis: 86400000 }, // 1 day in milliseconds
          startTimeMillis, // Start of the current day
          endTimeMillis, // End of the current day
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Error fetching step data:", error);
      return null;
    }

    const data = await response.json();
    console.log("Today's step data:", data);

    // Extract step count
    let stepCount = 0;
    if (data.bucket && data.bucket.length > 0) {
      data.bucket.forEach((bucket: any) => {
        if (bucket.dataset && bucket.dataset.length > 0) {
          bucket.dataset.forEach((dataset: any) => {
            if (dataset.point && dataset.point.length > 0) {
              dataset.point.forEach((point: any) => {
                if (point.value && point.value.length > 0) {
                  stepCount += point.value[0].intVal || 0; // Add up step counts
                }
              });
            }
          });
        }
      });
    }

    console.log(`Total steps today: ${stepCount}`);
    return stepCount;
  }

  async function fetchWeightData(accessToken: any) {
    const { startTimeMillis, endTimeMillis } = getTodayTimeRange();

    const response = await fetch(
      "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aggregateBy: [
            {
              dataTypeName: "com.google.weight",
            },
          ],
          bucketByTime: { durationMillis: 86400000 }, // 1 day in milliseconds
          startTimeMillis, // Start of the current day
          endTimeMillis, // End of the current day
        }),
      }
    );

    console.log(await response.json());

    if (!response.ok) {
      const error = await response.json();
      console.error("Error fetching weight data:", error);
      return null;
    }

    const data = await response.json();
    console.log("Weight data:", data);

    // Extract weight information
    const weightRecords: any = [];
    if (data.bucket && data.bucket.length > 0) {
      data.bucket.forEach((bucket: any) => {
        if (bucket.dataset && bucket.dataset.length > 0) {
          bucket.dataset.forEach((dataset: any) => {
            if (dataset.point && dataset.point.length > 0) {
              dataset.point.forEach((point: any) => {
                const weight = point.value?.[0]?.fpVal || null; // Extract weight (floating point value)
                const time = point.startTimeNanos
                  ? new Date(Number(point.startTimeNanos) / 1e6).toISOString()
                  : null;

                if (weight) {
                  weightRecords.push({ weight, time });
                }
              });
            }
          });
        }
      });
    }

    console.log("Extracted weight records:", weightRecords);
    return weightRecords;
  }

  const login = useGoogleLogin({
    onSuccess: async (response: any) => {
      console.log(response); // Contains access_token
      const { access_token } = response;
      // fetchStepData(access_token);
      await fetchTodaySteps(access_token);
      const weight = await fetchWeightData(access_token);
      setweight(weight);
    },
    onError: (error) => console.error("Login Failed:", error),
    scope: "https://www.googleapis.com/auth/fitness.activity.read",
  });

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div>
        <h1>Google Fit Steps</h1>
        <button onClick={() => login()}>Login with Google</button>;
        {steps !== null && <h2>Steps Today: {steps}</h2>}
        {error && <p style={{ color: "red" }}>{error}</p>}
        {JSON.stringify(weight)}
      </div>
    </GoogleOAuthProvider>
  );
};

// Wrap the app with GoogleOAuthProvider, providing your Google Client ID
export default function MainApp() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Home />
    </GoogleOAuthProvider>
  );
}
