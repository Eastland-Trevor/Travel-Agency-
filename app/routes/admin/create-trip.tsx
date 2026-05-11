import { Header } from "../../../components";
import { ComboBoxComponent } from "@syncfusion/ej2-react-dropdowns";
import type { Route } from "./+types/create-trip";
import { comboBoxItems, selectItems } from "~/constants";
import { cn, formatKey } from "~/lib/utils";
import {
  LayerDirective,
  LayersDirective,
  MapsComponent,
} from "@syncfusion/ej2-react-maps";
import React, { useState } from "react";
import { world_map } from "~/constants/world_map";
import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import { account } from "~/appwrite/client";
import { useNavigate } from "react-router";

export const loader = async () => {
  try {
    // More reliable endpoint
    const response = await fetch(
      "https://restcountries.com/v3.1/all?fields=name,flag,latlng,maps",
    );

    const data = await response.json();

    // Prevent crashes if API fails
    if (!Array.isArray(data)) {
      console.error("Unexpected API response:", data);

      return [
        {
          name: "🇳🇬 Nigeria",
          coordinates: [9.082, 8.6753],
          value: "Nigeria",
          openStreetMap: "",
        },
      ];
    }

    return data.map((country: any) => ({
      name: `${country.flag || ""} ${country.name?.common || ""}`,
      coordinates: country.latlng || [],
      value: country.name?.common || "",
      openStreetMap: country.maps?.openStreetMap || "",
    }));
  } catch (error) {
    console.error("Loader error:", error);

    // Fallback countries
    return [
      {
        name: "🇳🇬 Nigeria",
        coordinates: [9.082, 8.6753],
        value: "Nigeria",
        openStreetMap: "",
      },
      {
        name: "🇺🇸 United States",
        coordinates: [37.0902, -95.7129],
        value: "United States",
        openStreetMap: "",
      },
      {
        name: "🇬🇧 United Kingdom",
        coordinates: [55.3781, -3.436],
        value: "United Kingdom",
        openStreetMap: "",
      },
    ];
  }
};

const CreateTrip = ({ loaderData }: Route.ComponentProps) => {
  const countries = loaderData as Country[];
  const navigate = useNavigate();

  const [formData, setFormData] = useState<TripFormData>({
    country: countries[0]?.value || "",
    travelStyle: "",
    interest: "",
    budget: "",
    duration: 0,
    groupType: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

    if (
      !formData.country ||
      !formData.travelStyle ||
      !formData.interest ||
      !formData.budget ||
      !formData.groupType
    ) {
      setError("Please provide values for all fields");
      setLoading(false);
      return;
    }

    if (formData.duration < 1 || formData.duration > 10) {
      setError("Duration must be between 1 and 10 days");
      setLoading(false);
      return;
    }

    try {
      const user = await account.get();

      if (!user.$id) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/create-trip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          country: formData.country,
          numberOfDays: formData.duration,
          travelStyle: formData.travelStyle,
          interests: formData.interest,
          budget: formData.budget,
          groupType: formData.groupType,
          userId: user.$id,
        }),
      });

      const result: CreateTripResponse = await response.json();

      if (result?.id) {
        navigate(`/trips/${result.id}`);
      } else {
        setError("Failed to generate a trip");
      }
    } catch (e) {
      console.error("Error generating trip", e);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: keyof TripFormData, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const countryData = countries.map((country) => ({
    text: country.name,
    value: country.value,
  }));

  const selectedCountry = countries.find(
    (c: Country) => c.value === formData.country,
  );

  const mapData = [
    {
      country: formData.country,
      color: "#EA382E",
      coordinates: selectedCountry?.coordinates || [],
    },
  ];

  return (
    <main className="flex flex-col gap-10 pb-20 wrapper">
      <Header
        title="Add a New Trip"
        description="View and edit AI Generated travel plans"
      />

      <section className="mt-2.5 wrapper-md">
        <form className="trip-form" onSubmit={handleSubmit}>
          {/* Country */}
          <div>
            <label htmlFor="country">Country</label>

            <ComboBoxComponent
              id="country"
              dataSource={countryData}
              fields={{ text: "text", value: "value" }}
              placeholder="Select a Country"
              className="combo-box"
              value={formData.country}
              change={(e: { value: string | undefined }) => {
                if (e.value) {
                  handleChange("country", e.value);
                }
              }}
              allowFiltering
              filtering={(e) => {
                const query = e.text.toLowerCase();

                e.updateData(
                  countries
                    .filter((country) =>
                      country.name.toLowerCase().includes(query),
                    )
                    .map((country) => ({
                      text: country.name,
                      value: country.value,
                    })),
                );
              }}
            />
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="duration">Duration</label>

            <input
              id="duration"
              name="duration"
              type="number"
              placeholder="Enter number of days"
              className="form-input placeholder:text-gray-100"
              value={formData.duration || ""}
              onChange={(e) => handleChange("duration", Number(e.target.value))}
            />
          </div>

          {/* Other Select Fields */}
          {selectItems.map((key) => (
            <div key={key}>
              <label htmlFor={key}>{formatKey(key)}</label>

              <ComboBoxComponent
                id={key}
                dataSource={comboBoxItems[key].map((item) => ({
                  text: item,
                  value: item,
                }))}
                fields={{
                  text: "text",
                  value: "value",
                }}
                placeholder={`Select ${formatKey(key)}`}
                className="combo-box"
                value={formData[key]}
                change={(e: { value: string | undefined }) => {
                  if (e.value) {
                    handleChange(key, e.value);
                  }
                }}
                allowFiltering
                filtering={(e) => {
                  const query = e.text.toLowerCase();

                  e.updateData(
                    comboBoxItems[key]
                      .filter((item) => item.toLowerCase().includes(query))
                      .map((item) => ({
                        text: item,
                        value: item,
                      })),
                  );
                }}
              />
            </div>
          ))}

          {/* Map */}
          <div>
            <label htmlFor="location">Location on the world map</label>

            <MapsComponent>
              <LayersDirective>
                <LayerDirective
                  shapeData={world_map}
                  dataSource={mapData}
                  shapePropertyPath="name"
                  shapeDataPath="country"
                  shapeSettings={{
                    colorValuePath: "color",
                    fill: "#E5E5E5",
                  }}
                />
              </LayersDirective>
            </MapsComponent>
          </div>

          <div className="bg-gray-200 h-px w-full" />

          {/* Error */}
          {error && (
            <div className="error">
              <p>{error}</p>
            </div>
          )}

          {/* Submit */}
          <footer className="px-6 w-full">
            <ButtonComponent
              type="submit"
              className="button-class !h-12 !w-full"
              disabled={loading}
            >
              <img
                src={`/assets/icons/${
                  loading ? "loader.svg" : "magic-star.svg"
                }`}
                className={cn("size-5", {
                  "animate-spin": loading,
                })}
              />

              <span className="p-16-semibold text-white">
                {loading ? "Generating..." : "Generate Trip"}
              </span>
            </ButtonComponent>
          </footer>
        </form>
      </section>
    </main>
  );
};

export default CreateTrip;
