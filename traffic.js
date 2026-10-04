/*******************************************************
 * MỘC TRÀ - TRAFFIC API V2
 *
 * Chức năng:
 * - Visit
 * - Unique visitor
 * - Heartbeat
 * - Online realtime
 * - UTM tracking
 * - Traffic Daily
 * - Dashboard Stats
 * - JSONP
 *******************************************************/


/* =====================================================
   CONFIG
===================================================== */

const SPREADSHEET_ID =
  "1klu9X7sEE0aOEy8gyE9Adq9pYPWN9apnwfFSiiRdaKU";

const SESSION_SHEET =
  "Traffic_Sessions";

const DAILY_SHEET =
  "Traffic_Daily";

const ONLINE_TIMEOUT_SECONDS =
  60;


/* =====================================================
   DO GET
===================================================== */

function doGet(e) {

  try {

    const params =
      e && e.parameter
        ? e.parameter
        : {};

    const action =
      String(
        params.action || "ping"
      ).trim();

    const callback =
      String(
        params.callback || ""
      ).trim();


    /* ===============================
       PING
    =============================== */

    if (action === "ping") {

      return jsonResponse(
        {
          success: true,
          message:
            "MỘC TRÀ Traffic API đang hoạt động.",
          timestamp:
            new Date().toISOString()
        },
        callback
      );

    }


    /* ===============================
       VISIT
    =============================== */

    if (action === "visit") {

      const result =
        recordVisit(params);

      return jsonResponse(
        result,
        callback
      );

    }


    /* ===============================
       HEARTBEAT
    =============================== */

    if (action === "heartbeat") {

      const result =
        recordHeartbeat(params);

      return jsonResponse(
        result,
        callback
      );

    }


    /* ===============================
       STATS
    =============================== */

    if (action === "stats") {

      const result =
        getTrafficStats();

      return jsonResponse(
        result,
        callback
      );

    }


    /* ===============================
       UNKNOWN
    =============================== */

    return jsonResponse(
      {
        success: false,
        error:
          "Unknown action: " +
          action
      },
      callback
    );


  } catch (error) {

    return jsonResponse(
      {
        success: false,
        error:
          String(error)
      },
      e &&
      e.parameter
        ? String(
            e.parameter.callback || ""
          )
        : ""
    );

  }

}


/* =====================================================
   RECORD VISIT
===================================================== */

function recordVisit(data) {

  const visitorId =
    cleanValue(
      data.visitor_id
    );

  const sessionId =
    cleanValue(
      data.session_id
    );

  const page =
    cleanValue(
      data.page
    );

  const pageUrl =
    cleanValue(
      data.page_url
    );

  const referrer =
    cleanValue(
      data.referrer
    );

  const utmSource =
    cleanValue(
      data.utm_source
    );

  const utmMedium =
    cleanValue(
      data.utm_medium
    );

  const utmCampaign =
    cleanValue(
      data.utm_campaign
    );

  const utmContent =
    cleanValue(
      data.utm_content
    );


  if (
    !visitorId ||
    !sessionId
  ) {

    return {
      success: false,
      error:
        "visitor_id và session_id là bắt buộc."
    };

  }


  const lock =
    LockService.getScriptLock();

  lock.waitLock(10000);


  try {

    const ss =
      SpreadsheetApp.openById(
        SPREADSHEET_ID
      );

    const sheet =
      getSessionSheet(ss);

    const now =
      new Date();


    /*
     * Kiểm tra session đã tồn tại
     */

    const existingRow =
      findSessionRow(
        sheet,
        sessionId
      );


    if (existingRow > 0) {

      /*
       * Session cũ:
       * chỉ cập nhật last_seen
       */

      sheet
        .getRange(
          existingRow,
          4
        )
        .setValue(now);


      if (page) {

        sheet
          .getRange(
            existingRow,
            5
          )
          .setValue(page);

      }


      if (pageUrl) {

        sheet
          .getRange(
            existingRow,
            6
          )
          .setValue(pageUrl);

      }


      return {
        success: true,
        type: "existing",
        message:
          "Existing session updated."
      };

    }


    /*
     * Session mới
     */

    sheet.appendRow([

      visitorId,
      sessionId,
      now,
      now,
      page,
      pageUrl,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent

    ]);


    /*
     * Cập nhật Daily
     */

    updateDaily(
      ss,
      visitorId
    );


    return {
      success: true,
      type: "new",
      message:
        "Traffic recorded."
    };


  } finally {

    lock.releaseLock();

  }

}


/* =====================================================
   RECORD HEARTBEAT
===================================================== */

function recordHeartbeat(data) {

  const visitorId =
    cleanValue(
      data.visitor_id
    );

  const sessionId =
    cleanValue(
      data.session_id
    );

  const page =
    cleanValue(
      data.page
    );

  const pageUrl =
    cleanValue(
      data.page_url
    );


  if (
    !visitorId ||
    !sessionId
  ) {

    return {
      success: false,
      error:
        "visitor_id và session_id là bắt buộc."
    };

  }


  const lock =
    LockService.getScriptLock();

  lock.waitLock(10000);


  try {

    const ss =
      SpreadsheetApp.openById(
        SPREADSHEET_ID
      );

    const sheet =
      getSessionSheet(ss);

    const now =
      new Date();


    const row =
      findSessionRow(
        sheet,
        sessionId
      );


    if (row > 0) {

      /*
       * D = last_seen
       */

      sheet
        .getRange(
          row,
          4
        )
        .setValue(now);


      /*
       * E = page
       */

      if (page) {

        sheet
          .getRange(
            row,
            5
          )
          .setValue(page);

      }


      /*
       * F = page_url
       */

      if (pageUrl) {

        sheet
          .getRange(
            row,
            6
          )
          .setValue(pageUrl);

      }


      return {
        success: true,
        type: "heartbeat"
      };

    }


    /*
     * Nếu chưa có session
     * tạo session mới
     */

    sheet.appendRow([

      visitorId,
      sessionId,
      now,
      now,
      page,
      pageUrl,
      "",
      "",
      "",
      "",
      ""

    ]);


    /*
     * Tính visit
     */

    updateDaily(
      ss,
      visitorId
    );


    return {
      success: true,
      type:
        "heartbeat_new_session"
    };


  } finally {

    lock.releaseLock();

  }

}


/* =====================================================
   UPDATE DAILY
===================================================== */

function updateDaily(
  ss,
  visitorId
) {

  const sheet =
    getDailySheet(ss);


  const timezone =
    Session.getScriptTimeZone();


  const today =
    Utilities.formatDate(
      new Date(),
      timezone,
      "yyyy-MM-dd"
    );


  const row =
    findDailyRow(
      sheet,
      today
    );


  if (row <= 0) {

    /*
     * Ngày chưa tồn tại
     */

    sheet.appendRow([

      today,
      1,
      1

    ]);

    return;

  }


  /*
   * Tăng Visits
   */

  const currentVisits =
    Number(
      sheet
        .getRange(
          row,
          2
        )
        .getValue() || 0
    );


  sheet
    .getRange(
      row,
      2
    )
    .setValue(
      currentVisits + 1
    );


  /*
   * Tính lại unique visitor
   */

  const unique =
    countUniqueVisitors(
      ss,
      today
    );


  sheet
    .getRange(
      row,
      3
    )
    .setValue(unique);

}


/* =====================================================
   COUNT UNIQUE VISITORS
===================================================== */

function countUniqueVisitors(
  ss,
  dateKey
) {

  const sheet =
    getSessionSheet(ss);

  const lastRow =
    sheet.getLastRow();


  if (lastRow < 2) {

    return 0;

  }


  const data =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        3
      )
      .getValues();


  const timezone =
    Session.getScriptTimeZone();


  const visitors =
    new Set();


  data.forEach(function(row) {

    const visitorId =
      String(
        row[0] || ""
      ).trim();

    const firstSeen =
      row[2];


    if (
      !visitorId ||
      !(firstSeen instanceof Date)
    ) {

      return;

    }


    const date =
      Utilities.formatDate(
        firstSeen,
        timezone,
        "yyyy-MM-dd"
      );


    if (
      date === dateKey
    ) {

      visitors.add(
        visitorId
      );

    }

  });


  return visitors.size;

}


/* =====================================================
   GET TRAFFIC STATS
===================================================== */

function getTrafficStats() {

  const ss =
    SpreadsheetApp.openById(
      SPREADSHEET_ID
    );


  const timezone =
    Session.getScriptTimeZone();


  const now =
    new Date();


  const today =
    Utilities.formatDate(
      now,
      timezone,
      "yyyy-MM-dd"
    );


  const yesterdayDate =
    new Date(now);


  yesterdayDate.setDate(
    yesterdayDate.getDate() - 1
  );


  const yesterday =
    Utilities.formatDate(
      yesterdayDate,
      timezone,
      "yyyy-MM-dd"
    );


  const daily =
    getDailySheet(ss);


  const todayData =
    readDaily(
      daily,
      today
    );


  const yesterdayData =
    readDaily(
      daily,
      yesterday
    );


  /*
   * Online
   */

  const online =
    countOnline(
      ss
    );


  /*
   * 7 ngày
   */

  const last7Days =
    [];


  for (
    let i = 6;
    i >= 0;
    i--
  ) {

    const date =
      new Date(now);


    date.setDate(
      date.getDate() - i
    );


    const key =
      Utilities.formatDate(
        date,
        timezone,
        "yyyy-MM-dd"
      );


    const item =
      readDaily(
        daily,
        key
      );


    last7Days.push({

      date: key,

      visits:
        item.visits,

      uniqueVisitors:
        item.uniqueVisitors

    });

  }


  return {

    success: true,

    timestamp:
      now.toISOString(),

    today: {

      visits:
        todayData.visits,

      uniqueVisitors:
        todayData.uniqueVisitors

    },

    yesterday: {

      visits:
        yesterdayData.visits,

      uniqueVisitors:
        yesterdayData.uniqueVisitors

    },

    online:
      online,

    last7Days:
      last7Days

  };

}


/* =====================================================
   READ DAILY
===================================================== */

function readDaily(
  sheet,
  dateKey
) {

  const row =
    findDailyRow(
      sheet,
      dateKey
    );


  if (row <= 0) {

    return {

      visits: 0,

      uniqueVisitors: 0

    };

  }


  return {

    visits:
      Number(
        sheet
          .getRange(
            row,
            2
          )
          .getValue() || 0
      ),

    uniqueVisitors:
      Number(
        sheet
          .getRange(
            row,
            3
          )
          .getValue() || 0
      )

  };

}


/* =====================================================
   ONLINE
===================================================== */

function countOnline(
  ss
) {

  const sheet =
    getSessionSheet(ss);


  const lastRow =
    sheet.getLastRow();


  if (lastRow < 2) {

    return 0;

  }


  const data =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        4
      )
      .getValues();


  const now =
    new Date();


  const timeout =
    ONLINE_TIMEOUT_SECONDS *
    1000;


  const visitors =
    new Set();


  data.forEach(function(row) {

    const visitorId =
      String(
        row[0] || ""
      ).trim();


    const lastSeen =
      row[3];


    if (
      !visitorId ||
      !(lastSeen instanceof Date)
    ) {

      return;

    }


    const diff =
      now.getTime() -
      lastSeen.getTime();


    if (
      diff >= 0 &&
      diff <= timeout
    ) {

      visitors.add(
        visitorId
      );

    }

  });


  return visitors.size;

}


/* =====================================================
   FIND SESSION ROW
===================================================== */

function findSessionRow(
  sheet,
  sessionId
) {

  const lastRow =
    sheet.getLastRow();


  if (lastRow < 2) {

    return -1;

  }


  const values =
    sheet
      .getRange(
        2,
        2,
        lastRow - 1,
        1
      )
      .getValues();


  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    if (
      String(
        values[i][0] || ""
      ).trim() === sessionId
    ) {

      return i + 2;

    }

  }


  return -1;

}


/* =====================================================
   FIND DAILY ROW
===================================================== */

function findDailyRow(
  sheet,
  dateKey
) {

  const lastRow =
    sheet.getLastRow();


  if (lastRow < 2) {

    return -1;

  }


  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        1
      )
      .getValues();


  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    let value =
      values[i][0];


    if (!value) {

      continue;

    }


    if (
      value instanceof Date
    ) {

      value =
        Utilities.formatDate(
          value,
          Session.getScriptTimeZone(),
          "yyyy-MM-dd"
        );

    } else {

      value =
        String(value).trim();

    }


    if (
      value === dateKey
    ) {

      return i + 2;

    }

  }


  return -1;

}


/* =====================================================
   GET SESSION SHEET
===================================================== */

function getSessionSheet(
  ss
) {

  let sheet =
    ss.getSheetByName(
      SESSION_SHEET
    );


  if (!sheet) {

    sheet =
      ss.insertSheet(
        SESSION_SHEET
      );


    sheet.appendRow([

      "visitor_id",
      "session_id",
      "first_seen",
      "last_seen",
      "page",
      "page_url",
      "referrer",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content"

    ]);


    sheet.setFrozenRows(1);

  }


  return sheet;

}


/* =====================================================
   GET DAILY SHEET
===================================================== */

function getDailySheet(
  ss
) {

  let sheet =
    ss.getSheetByName(
      DAILY_SHEET
    );


  if (!sheet) {

    sheet =
      ss.insertSheet(
        DAILY_SHEET
      );


    sheet.appendRow([

      "date",
      "visits",
      "unique_visitors"

    ]);


    sheet.setFrozenRows(1);

  }


  return sheet;

}


/* =====================================================
   CLEAN VALUE
===================================================== */

function cleanValue(
  value
) {

  if (
    value === undefined ||
    value === null
  ) {

    return "";

  }


  return String(value)
    .trim()
    .substring(
      0,
      2000
    );

}


/* =====================================================
   JSON / JSONP
===================================================== */

function jsonResponse(
  data,
  callback
) {

  const json =
    JSON.stringify(data);


  if (callback) {

    const safeCallback =
      String(callback)
        .replace(
          /[^a-zA-Z0-9_.$]/g,
          ""
        );


    if (safeCallback) {

      return ContentService
        .createTextOutput(
          safeCallback +
          "(" +
          json +
          ");"
        )
        .setMimeType(
          ContentService.MimeType.JAVASCRIPT
        );

    }

  }


  return ContentService
    .createTextOutput(
      json
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );

}


/* =====================================================
   TEST VISIT
===================================================== */

function testVisit() {

  const result =
    recordVisit({

      visitor_id:
        "TEST_" +
        Date.now(),

      session_id:
        "SESSION_" +
        Date.now(),

      page:
        "test",

      page_url:
        "https://example.com",

      referrer:
        "",

      utm_source:
        "test",

      utm_medium:
        "test",

      utm_campaign:
        "test",

      utm_content:
        "test"

    });


  Logger.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );


  return result;

}


/* =====================================================
   TEST STATS
===================================================== */

function testStats() {

  const result =
    getTrafficStats();


  Logger.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );


  return result;

}
