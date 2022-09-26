import axios from "axios";
import { createClient } from "redis";
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT;
const client = createClient({
  url: `${process.env.URLS_REDIS}`,
});

client.on("error", (err) => console.log("Redis Client Error", err));

await client.connect();

const parseTime = (jadwal) => {
  let hour = [];
  let minute = [];

  let times = [];

  for (const hiBiasa of jadwal) {
    let hiTime = parseInt(hiBiasa);
    if (isNaN(hiTime)) continue;

    if (hour.length < 2) {
      hour.push(hiBiasa);
      continue;
    }

    if (minute.length < 2) {
      minute.push(hiBiasa);
    }

    if (hour.length === 2 && minute.length === 2) {
      times.push(`${hour.join("")}:${minute.join("")}`);

      hour = [];
      minute = [];
    }
  }

  return times;
};

const diferTimeLoc = (weekdays, weekends) => {
  return {
    weekdays: weekdays ? parseTime(weekdays) : null,
    weekends: weekends ? parseTime(weekends) : null,
  };
};

const serveData = (praseDataMRTs) => {
  const newDataMRTs = praseDataMRTs.map((obj) => {
    const schedules = [
      {
        location: "hi",
        times: diferTimeLoc(obj.jadwal_hi_biasa, obj.jadwal_hi_libur),
      },
      {
        location: "lb",
        times: diferTimeLoc(obj.jadwal_lb_biasa, obj.jadwal_lb_libur),
      },
    ];
    const complete = {
      nid: obj.nid,
      title: obj.title,
      urutan: parseInt(obj.urutan),
      isbig: parseInt(obj.isbig),
      path: `${process.env.URL_MAIN}${obj.path}`,
      catatan: obj.catatan,
      banner: obj.banner,
      peta_lokalitas: obj.peta_lokalitas,
      schedules: schedules,
      estimasi: obj.estimasi,
      retails: obj.retails,
      fasilitas: obj.fasilitas,
    };
    return complete;
  });
  return newDataMRTs;
};

const serveDataNIDs = (praseDataMRTs) => {
  const newDataMRTs = praseDataMRTs.map((obj) => {
    return obj.nid;
  });
  return newDataMRTs;
};

const fetchAll = async () => {
  try {
    const { data, status } = await axios.get(`${process.env.URL_STATSIUNS}`);
    return data;
  } catch (error) {}
};

const getAllData = async (req, res) => {
  try {
    const data = await fetchAll();
    await client.set("mrtbase", JSON.stringify(serveData(data)));

    return res.json(serveData(data));
  } catch (error) {
    throw error;
  }
};

const cacheAll = async (req, res, next) => {
  try {
    const dataMRTs = await client.get("mrtbase");

    if (dataMRTs) {
      const dataMRTBase = JSON.parse(dataMRTs);

      return res.json(dataMRTBase);
    } else {
      return next();
    }
  } catch (error) {
    throw error;
  }
};

const getAllDataNIDs = async (req, res) => {
  try {
    const data = await fetchAll();
    await client.set("mrtnids", JSON.stringify(serveDataNIDs(data)));

    return res.json(serveDataNIDs(data));
  } catch (error) {
    throw error;
  }
};

const cacheAllDataNIDs = async (req, res, next) => {
  try {
    const data = await client.get("mrtnids");

    if (data) {
      const result = JSON.parse(data);

      return res.json(result);
    } else {
      return next();
    }
  } catch (error) {
    throw error;
  }
};

app.get("/", cacheAll, getAllData);

app.get("/nids", cacheAllDataNIDs, getAllDataNIDs);

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at ${port}`);
});
