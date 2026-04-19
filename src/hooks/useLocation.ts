import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useErrorHandler } from "react-error-boundary";
import { EmptyLocationModel, LocationModel } from "../models";

export const useLocation = (locationName: string, useMockData: boolean) => {
  const [location, setLocation] =
    useState<LocationModel>(EmptyLocationModel);

  const handleError = useErrorHandler();

  const setCoords = (lat: number, lon: number, locality = "Tokyo", country = "JP") => {
    setLocation({
      position: {
        latitude: lat,
        longitude: lon,
      },
      locality,
      country,
    });
  };

  const getCoordsByIP = async () => {
    try {
      const res = await axios.get("https://ipapi.co/json/");
      setCoords(
        res.data.latitude,
        res.data.longitude,
        res.data.city,
        res.data.country_code
      );
    } catch {
      console.warn("IP location failed → loading Tokyo fallback");
      setCoords(35.6762, 139.6503, "Tokyo", "JP");
    }
  };

  const getCoordsByLocationName = useCallback(
    async (locationName: string) => {
      try {
        const res = await axios.get(
          `https://nominatim.openstreetmap.org/search?q=${locationName}&format=json&limit=1`
        );

        if (res.data && res.data[0]) {
          setCoords(
            parseFloat(res.data[0].lat),
            parseFloat(res.data[0].lon),
            locationName,
            ""
          );
        } else {
          getCoordsByIP();
        }
      } catch (error) {
        handleError(error);
      }
    },
    [handleError]
  );

  const getCoordsByGPS = useCallback(() => {
    if (!navigator.geolocation) {
      getCoordsByIP();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos: GeolocationPosition) => {
        setCoords(
          pos.coords.latitude,
          pos.coords.longitude
        );
      },
      () => {
        console.warn("GPS blocked → using IP fallback");
        getCoordsByIP();
      }
    );
  }, []);

  useEffect(() => {
    if (locationName === "") {
      getCoordsByGPS();
    } else {
      getCoordsByLocationName(locationName);
    }
  }, [locationName, getCoordsByGPS, getCoordsByLocationName]);

  return {
    location,
  };
};
