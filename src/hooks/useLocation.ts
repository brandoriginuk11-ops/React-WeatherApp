import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useErrorHandler } from "react-error-boundary";
import { EmptyLocationModel, LocationModel } from "../models";

export const useLocation = (locationName: string, useMockData: boolean) => {
  const apiKey = process.env.REACT_APP_GEOLOCATION_API_KEY;
  const geocodeBaseUrl = process.env.REACT_APP_GEOLOCATION_GEOCODE_BASEURL;

  const [location, setLocation] =
    useState<LocationModel>(EmptyLocationModel);

  const handleError = useErrorHandler();

  // Save coords locally
  const saveCoords = (lat: number, lon: number) => {
    localStorage.setItem(
      "weather_coords",
      JSON.stringify({
        lat,
        lon,
      })
    );
  };

  // Set location helper
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

  // Reverse geocode from GPS coords
  const getLocationDetails = useCallback(
    (position: GeolocationPosition) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      axios
        .get(
          useMockData
            ? "./mock-data/locality.json"
            : `${geocodeBaseUrl}?latlng=${lat},${lon}&result_type=locality&key=${apiKey}`
        )
        .then((res: any) => {
          if (res.data?.results?.[0]) {
            const formattedAddress =
              res.data.results[0].formatted_address.split(",");

            setCoords(
              lat,
              lon,
              formattedAddress[0].replace(/\s/g, ""),
              formattedAddress[1]?.replace(/\s/g, "") || ""
            );
          } else {
            setCoords(lat, lon, "CurrentLocation", "");
          }
        })
        .catch(() => {
          setCoords(lat, lon, "CurrentLocation", "");
        });
    },
    [apiKey, geocodeBaseUrl, useMockData]
  );

  // Convert city name → coords
  const getCoordsByLocationName = useCallback(
    (locationName: string) => {
      axios
        .get(
          useMockData
            ? "./mock-data/latlong.json"
            : `${geocodeBaseUrl}?address=${locationName}&key=${apiKey}`
        )
        .then((res: any) => {
          if (res.data?.results?.[0]) {
            const location = res.data.results[0].geometry.location;
            const formattedAddress =
              res.data.results[0].formatted_address.split(",");

            setCoords(
              location.lat,
              location.lng,
              formattedAddress[0].replace(/\s/g, ""),
              formattedAddress[1]?.replace(/\s/g, "") || ""
            );
          }
        })
        .catch(handleError);
    },
    [apiKey, geocodeBaseUrl, handleError, useMockData]
  );

  // IP fallback
  const getCoordsByIP = () => {
    axios
      .get("https://ipapi.co/json/")
      .then((res) => {
        if (res.data?.latitude && res.data?.longitude) {
          setCoords(
            res.data.latitude,
            res.data.longitude,
            res.data.city || "CurrentLocation",
            res.data.country_name || ""
          );
        } else {
          fallbackTokyo();
        }
      })
      .catch(fallbackTokyo);
  };

  // Final fallback
  const fallbackTokyo = () => {
    setCoords(35.6762, 139.6503, "Tokyo", "JP");
  };

  // GPS detection
  const getCoordsByGPS = useCallback(() => {
    if (!navigator.geolocation) {
      getCoordsByIP();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos: GeolocationPosition) => {
        console.log("GPS success:", pos.coords);
        getLocationDetails(pos);
      },
      (error) => {
        console.warn("GPS failed:", error.message);
        getCoordsByIP();
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, [getLocationDetails]);

  useEffect(() => {
    if (locationName !== "") {
      getCoordsByLocationName(locationName);
      return;
    }

    // Load cached coords instantly
    const cached = localStorage.getItem("weather_coords");

    if (cached) {
      const coords = JSON.parse(cached);

      if (coords?.lat && coords?.lon) {
        setCoords(coords.lat, coords.lon, "SavedLocation", "");
        return;
      }
    }

    // Otherwise detect GPS
    getCoordsByGPS();
  }, [locationName, getCoordsByGPS, getCoordsByLocationName]);

  return {
    location,
  };
};
