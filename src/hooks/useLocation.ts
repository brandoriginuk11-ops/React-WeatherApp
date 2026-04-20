import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { EmptyLocationModel, LocationModel } from "../models";

export const useLocation = (locationName: string, useMockData: boolean) => {

  const weatherApiKey = process.env.REACT_APP_OPENWEATHER_API_KEY;

  const [location, setLocation] =
    useState<LocationModel>(EmptyLocationModel);

  // Save coordinates locally
  const saveCoords = (lat: number, lon: number) => {
    localStorage.setItem(
      "weather_coords",
      JSON.stringify({ lat, lon })
    );
  };

  // Update location state
  const setCoords = (
    latitude: number,
    longitude: number,
    locality: string,
    country: string
  ) => {
    setLocation({
      position: {
        latitude,
        longitude,
      },
      locality,
      country,
    });

    saveCoords(latitude, longitude);
  };

  // Reverse geocode coords → city name
  const reverseGeocode = useCallback(
    (lat: number, lon: number) => {

      axios
        .get(
          `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${weatherApiKey}`
        )
        .then((res: any) => {

          if (res.data?.length > 0) {

            const data = res.data[0];

            setCoords(
              lat,
              lon,
              data.name,
              data.country
            );

          } else {

            fallbackTokyo();

          }

        })
        .catch(() => {

          fallbackTokyo();

        });

    },
    [weatherApiKey]
  );

  // Search city name → coords
  const getCoordsByLocationName = useCallback(
    (locationName: string) => {

      axios
        .get(
          `https://api.openweathermap.org/geo/1.0/direct?q=${locationName}&limit=1&appid=${weatherApiKey}`
        )
        .then((res: any) => {

          if (res.data?.length > 0) {

            const data = res.data[0];

            setCoords(
              data.lat,
              data.lon,
              data.name,
              data.country
            );

          }

        })
        .catch(() => {

          fallbackTokyo();

        });

    },
    [weatherApiKey]
  );

  // IP fallback
  const getCoordsByIP = () => {

    axios
      .get("https://ipapi.co/json/")
      .then((res) => {

        if (res.data?.latitude) {

          reverseGeocode(
            res.data.latitude,
            res.data.longitude
          );

        } else {

          fallbackTokyo();

        }

      })
      .catch(fallbackTokyo);

  };

  // Final fallback
  const fallbackTokyo = () => {

    setCoords(
      35.6762,
      139.6503,
      "Tokyo",
      "JP"
    );

  };

  // GPS detection
  const getCoordsByGPS = useCallback(() => {

    if (!navigator.geolocation) {

      getCoordsByIP();
      return;

    }

    navigator.geolocation.getCurrentPosition(

      (pos) => {

        reverseGeocode(
          pos.coords.latitude,
          pos.coords.longitude
        );

      },

      () => {

        getCoordsByIP();

      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }

    );

  }, [reverseGeocode]);

  useEffect(() => {

    if (locationName !== "") {

      getCoordsByLocationName(locationName);
      return;

    }

    // Load cached coords first
    const cached = localStorage.getItem("weather_coords");

    if (cached) {

      const coords = JSON.parse(cached);

      if (coords?.lat && coords?.lon) {

        reverseGeocode(
          coords.lat,
          coords.lon
        );

        return;

      }

    }

    // Otherwise detect automatically
    getCoordsByGPS();

  }, [
    locationName,
    getCoordsByGPS,
    getCoordsByLocationName,
    reverseGeocode
  ]);

  return {
    location,
  };

};
