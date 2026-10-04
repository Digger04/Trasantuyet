/*******************************************************
 * MỘC TRÀ - TRAFFIC API
 * 
 * Chức năng:
 * 1. Ghi lượt truy cập
 * 2. Ghi visitor duy nhất
 * 3. Theo dõi online realtime
 * 4. Heartbeat
 * 5. Thống kê hôm nay / hôm qua
 * 6. Thống kê 7 ngày
 * 7. Hỗ trợ JSONP cho Dashboard
 *
 * Google Spreadsheet:
 *   File ID: SPREADSHEET_ID
 *
 * Sheets:
 *   Traffic_Sessions
 *   Traffic_Daily
 *******************************************************/


/* =====================================================
   CONFIG
===================================================== */

const SPREADSHEET_ID =
  "1klu9X7sEE0aOEy8gyE9Adq9pYPWN9apnwfFSiiRdaKU";

const SESSION_SHEET = "Traffic_Sessions";
const DAILY_SHEET = "Traffic_Daily";

// Visitor được tính là ONLINE nếu heartbeat
// trong vòng 60 giây gần nhất.
const ONLINE_TIMEOUT_SECONDS = 60;


/* =====================================================
   GET API
===================================================== */

function doGet(e) {

  try {

    const params = e && e.parameter
      ? e.parameter
      : {};

    const action =
      String(params.action || "ping").trim();

    // Callback dành cho JSONP Dashboard
    const callback =
      String(params.callback || "").trim();


    /* -----------------------------------------------
       PING
    ------------------------------------------------ */

    if (action === "ping") {

      return jsonResponse(
        {
          success: true,
          message: "MỘC TRÀ Traffic API đang hoạt động.",
          timestamp: new Date().toISOString()
        },
        callback
      );

    }


    /* -----------------------------------------------
       VISIT
    ------------------------------------------------ */

    if (action === "visit") {

      const result = handleVisit(params);

      return jsonResponse(
        result,
        callback
      );

    }


    /* -----------------------------------------------
       HEARTBEAT
    ------------------------------------------------ */

    if (action === "heartbeat") {

      const result = handleHeartbeat(params);

      return jsonResponse(
        result,
        callback
      );

    }


    /* -----------------------------------------------
       STATS
    ------------------------------------------------ */

    if (action === "stats") {

      const result = getTrafficStats();

      return jsonResponse(
        result,
        callback
      );

    }


    /* -----------------------------------------------
       UNKNOWN ACTION
    ------------------------------------------------ */

    return jsonResponse(
      {
        success: false,
        error: "Unknown action.",
        action: action
      },
      callback
    );


  } catch (error) {

    return jsonResponse(
      {
        success: false,
        error: String(error)
      },
      e && e.parameter
        ? String(e.parameter.callback || "").trim()
        : ""
    );

  }

}


/* =====================================================
   VISIT
===================================================== */

function handleVisit(data) {

  const visitorId =
    cleanValue(data.visitor_id);

  const sessionId =
    cleanValue(data.session_id);

  const page =
    cleanValue(data.page);

  const pageUrl =
    cleanValue(data.page_url);

  const referrer =
    cleanValue(data.referrer);

  const utmSource =
    cleanValue(data.utm_source);

  const utmMedium =
    cleanValue(data.utm_medium);

  const utmCampaign =
    cleanValue(data.utm_campaign);

  const utmContent =
    cleanValue(data.utm_content);


  // Visitor ID và Session ID là bắt buộc
  if (!visitorId || !sessionId) {

    return {
      success: false,
      error: "visitor_id và session_id là bắt buộc."
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
      getOrCreateSessionSheet(ss);


    const now =
      new Date();


    /*
     * Kiểm tra session hiện tại đã tồn tại chưa
     */

    const existingRow =
      findSession(
        sheet,
        sessionId
      );


    if (existingRow > 0) {

      // Session đã tồn tại
      // Chỉ cập nhật last_seen

      sheet
        .getRange(existingRow, 5)
        .setValue(now);


      // Cập nhật lại page nếu có
      if (page) {

        sheet
          .getRange(existingRow, 6)
          .setValue(page);

      }


      // Cập nhật URL nếu có
      if (pageUrl) {

        sheet
          .getRange(existingRow, 7)
          .setValue(pageUrl);

      }


    } else {

      /*
       * Session mới
       */

      sheet.appendRow([
        visitorId,       // A
        sessionId,       // B
        now,             // C first_seen
        now,             // D last_seen
        page,            // E page
        pageUrl,         // F page_url
        referrer,        // G referrer
        utmSource,       // H utm_source
        utmMedium,       // I utm_medium
        utmCampaign,     // J utm_campaign
        utmContent       // K utm_content
      ]);

    }


    /*
     * Cập nhật thống kê ngày
     */

    updateDailyTraffic(
      ss,
      visitorId
    );


    return {
      success: true,
      type: "visit",
      visitor_id: visitorId,
      session_id: sessionId,
      timestamp: now.toISOString()
    };


  } finally {

    lock.releaseLock();

  }

}


/* =====================================================
   HEARTBEAT
===================================================== */

function handleHeartbeat(data) {

  const visitorId =
    cleanValue(data.visitor_id);

  const sessionId =
    cleanValue(data.session_id);

  const page =
    cleanValue(data.page);

  const pageUrl =
    cleanValue(data.page_url);


  if (!visitorId || !sessionId) {

    return {
      success: false,
      error: "visitor_id và session_id là bắt buộc."
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
      getOrCreateSessionSheet(ss);


    const now =
      new Date();


    const existingRow =
      findSession(
        sheet,
        sessionId
      );


    if (existingRow > 0) {

      /*
       * Chỉ cập nhật last_seen
       */

      sheet
        .getRange(existingRow, 4)
        .setValue(now);


      /*
       * Có thể cập nhật page hiện tại
       */

      if (page) {

        sheet
          .getRange(existingRow, 5)
          .setValue(page);

      }


      if (pageUrl) {

        sheet
          .getRange(existingRow, 6)
          .setValue(pageUrl);

      }


    } else {

      /*
       * Trường hợp heartbeat tới trước visit
       * thì tạo session luôn.
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
       * Đồng thời tính visit
       */

      updateDailyTraffic(
        ss,
        visitorId
      );

    }


    return {
      success: true,
      type: "heartbeat",
      timestamp: now.toISOString()
    };


  } finally {

    lock.releaseLock();

  }

}


/* =====================================================
   DAILY TRAFFIC
===================================================== */

function updateDailyTraffic(
  ss,
  visitorId
) {

  const sheet =
    getOrCreateDailySheet(ss);


  const today =
    new Date();


  const dateKey =
    Utilities.formatDate(
      today,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );


  /*
   * Tìm dòng ngày hôm nay
   */

  const row =
    findDailyRow(
      sheet,
      dateKey
    );


  if (row > 0) {

    /*
     * Tăng visits
     */

    const currentVisits =
      Number(
        sheet
          .getRange(row, 2)
          .getValue() || 0
      );


    sheet
      .getRange(row, 2)
      .setValue(
        currentVisits + 1
      );


    /*
     * Unique visitor sẽ được
     * cập nhật lại chính xác sau.
     */

    const uniqueVisitors =
      countUniqueVisitorsToday(
        ss,
        dateKey
      );


    sheet
      .getRange(row, 3)
      .setValue(
        uniqueVisitors
      );


  } else {

    /*
     * Tạo ngày mới
     */

    sheet.appendRow([
      dateKey,
      1,
      1
    ]);

  }

}


/* =====================================================
   GET TRAFFIC STATS
===================================================== */

function getTrafficStats() {

  const ss =
    SpreadsheetApp.openById(
      SPREADSHEET_ID
    );


  const now =
    new Date();


  const timezone =
    Session.getScriptTimeZone();


  const todayKey =
    Utilities.formatDate(
      now,
      timezone,
      "yyyy-MM-dd"
    );


  const yesterday =
    new Date(now);

  yesterday.setDate(
    yesterday.getDate() - 1
  );


  const yesterdayKey =
    Utilities.formatDate(
      yesterday,
      timezone,
      "yyyy-MM-dd"
    );


  const dailySheet =
    getOrCreateDailySheet(ss);


  /*
   * Hôm nay
   */

  const todayData =
    getDailyRow(
      dailySheet,
      todayKey
    );


  /*
   * Hôm qua
   */

  const yesterdayData =
    getDailyRow(
      dailySheet,
      yesterdayKey
    );


  /*
   * Online
   */

  const online =
    countOnlineVisitors(ss);


  /*
   * 7 ngày gần nhất
   */

  const last7Days =
    getLast7Days(
      dailySheet
    );


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
   ONLINE VISITORS
===================================================== */

function countOnlineVisitors(ss) {

  const sheet =
    getOrCreateSessionSheet(ss);


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
        11
      )
      .getValues();


  const now =
    new Date();


  const timeout =
    ONLINE_TIMEOUT_SECONDS * 1000;


  /*
   * Dùng Set để một visitor
   * mở nhiều session vẫn chỉ tính 1 online.
   */

  const onlineVisitors =
    new Set();


  data.forEach(function(row) {

    const visitorId =
      String(row[0] || "").trim();


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

      onlineVisitors.add(
        visitorId
      );

    }

  });


  return onlineVisitors.size;

}


/* =====================================================
   COUNT UNIQUE VISITORS TODAY
===================================================== */

function countUniqueVisitorsToday(
  ss,
  dateKey
) {

  const sheet =
    getOrCreateSessionSheet(ss);


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
        11
      )
      .getValues();


  const timezone =
    Session.getScriptTimeZone();


  const visitors =
    new Set();


  data.forEach(function(row) {

    const visitorId =
      String(row[0] || "").trim();


    const firstSeen =
      row[2];


    if (
      !visitorId ||
      !(firstSeen instanceof Date)
    ) {

      return;

    }


    const rowDate =
      Utilities.formatDate(
        firstSeen,
        timezone,
        "yyyy-MM-dd"
      );


    if (
      rowDate === dateKey
    ) {

      visitors.add(
        visitorId
      );

    }

  });


  return visitors.size;

}


/* =====================================================
   LAST 7 DAYS
===================================================== */

function getLast7Days(
  sheet
) {

  const timezone =
    Session.getScriptTimeZone();


  const result = [];


  const today =
    new Date();


  for (
    let i = 6;
    i >= 0;
    i--
  ) {

    const date =
      new Date(today);


    date.setDate(
      date.getDate() - i
    );


    const dateKey =
      Utilities.formatDate(
        date,
        timezone,
        "yyyy-MM-dd"
      );


    const data =
      getDailyRow(
        sheet,
        dateKey
      );


    result.push({

      date:
        dateKey,

      visits:
        data.visits,

      uniqueVisitors:
        data.uniqueVisitors

    });

  }


  return result;

}


/* =====================================================
   GET DAILY ROW
===================================================== */

function getDailyRow(
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
          .getRange(row, 2)
          .getValue() || 0
      ),

    uniqueVisitors:
      Number(
        sheet
          .getRange(row, 3)
          .getValue() || 0
      )

  };

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

    const value =
      values[i][0];


    if (!value) {

      continue;

    }


    let currentKey = "";


    if (
      value instanceof Date
    ) {

      currentKey =
        Utilities.formatDate(
          value,
          Session.getScriptTimeZone(),
          "yyyy-MM-dd"
        );

    } else {

      currentKey =
        String(value).trim();

    }


    if (
      currentKey === dateKey
    ) {

      return i + 2;

    }

  }


  return -1;

}


/* =====================================================
   FIND SESSION
===================================================== */

function findSession(
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
      String(values[i][0] || "").trim() ===
      sessionId
    ) {

      return i + 2;

    }

  }


  return -1;

}


/* =====================================================
   CREATE / GET SESSION SHEET
===================================================== */

function getOrCreateSessionSheet(
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


    /*
     * Freeze header
     */

    sheet
      .setFrozenRows(1);

  }


  return sheet;

}


/* =====================================================
   CREATE / GET DAILY SHEET
===================================================== */

function getOrCreateDailySheet(
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


    sheet
      .setFrozenRows(1);

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
    .substring(0, 2000);

}


/* =====================================================
   JSON / JSONP RESPONSE
===================================================== */

function jsonResponse(
  data,
  callback
) {

  const json =
    JSON.stringify(data);


  /*
   * Nếu Dashboard truyền callback
   * thì trả JSONP.
   */

  if (callback) {

    /*
     * Chỉ cho phép tên function hợp lệ.
     * Tránh callback injection.
     */

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


  /*
   * Không có callback
   * => trả JSON bình thường.
   */

  return ContentService

    .createTextOutput(
      json
    )

    .setMimeType(
      ContentService.MimeType.JSON
    );

}


/* =====================================================
   TEST TRAFFIC API
===================================================== */

function testTraffic() {

  const ss =
    SpreadsheetApp.openById(
      SPREADSHEET_ID
    );


  /*
   * Tạo sheet nếu chưa có
   */

  const sessionSheet =
    getOrCreateSessionSheet(ss);


  const dailySheet =
    getOrCreateDailySheet(ss);


  Logger.log(
    "Session Sheet: " +
    sessionSheet.getName()
  );


  Logger.log(
    "Daily Sheet: " +
    dailySheet.getName()
  );


  /*
   * Test visitor
   */

  const testVisitor =
    "test_visitor_" +
    new Date().getTime();


  const testSession =
    "test_session_" +
    new Date().getTime();


  const result =
    handleVisit({

      visitor_id:
        testVisitor,

      session_id:
        testSession,

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
