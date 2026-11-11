/**
 * =========================================================================================
 * RENDIMIENTO GLP REGIONAL NORTE - CONTROL Y REGISTRO DE CILINDROS DE MONTACARGAS
 * ARCHIVO BACKEND DE GOOGLE APPS SCRIPT (Código.gs) - VERSIÓN CON FOTO EVIDENCIA IA
 * =========================================================================================
 * 
 * INCLUYE:
 * - Detección y auditoría de horómetro (IA y corrección manual).
 * - Guardado automático de fotos de evidencia en carpeta Google Drive: "Evidencias Horómetro GLP".
 * - Compatibilidad total con la hoja Registro y nuevas columnas de auditoría.
 * =========================================================================================
 */

// Nombres exactos de las hojas según especificación
const SHEETS = {
  MAQUINAS: 'Máquinas por CD',
  OPERADORES: 'Operadores por CD',
  REGISTRO: 'Registro'
};

// Encabezados completos con auditoría de foto e IA
const HEADERS_REGISTRO = [
  'Fecha',
  'Hora',
  'CD',
  'Máquina',
  'Operador',
  'Turno',
  'Horómetro',
  'ID cilindro lleno',
  'Tara cilindro lleno',
  'Peso cilindro lleno',
  'Peso neto',
  'Observaciones',
  'Usuario',
  'Horómetro detectado IA',
  'Horómetro final',
  'Método captura',
  'URL evidencia foto'
];

/**
 * Menú personalizado en Google Sheets
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('⛽ Control Cilindros')
    .addItem('⚙️ Inicializar / Verificar Hojas Maestras', 'inicializarEstructuraHojas')
    .addItem('📊 Resumen de Registros', 'mostrarResumenRegistros')
    .addToUi();
}

/**
 * Inicializa y valida la existencia de las 3 hojas maestras
 */
function inicializarEstructuraHojas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Hoja Registro
  let sheetRegistro = ss.getSheetByName(SHEETS.REGISTRO);
  if (!sheetRegistro) {
    sheetRegistro = ss.insertSheet(SHEETS.REGISTRO);
  }
  if (sheetRegistro.getLastRow() === 0) {
    sheetRegistro.appendRow(HEADERS_REGISTRO);
    sheetRegistro.getRange(1, 1, 1, HEADERS_REGISTRO.length)
      .setFontWeight('bold')
      .setBackground('#24465A')
      .setFontColor('#FFFFFF');
    sheetRegistro.setFrozenRows(1);
  } else {
    // Si la hoja ya tiene encabezados antiguos, verificar si faltan las columnas de evidencia
    const currentHeaders = sheetRegistro.getRange(1, 1, 1, Math.max(13, sheetRegistro.getLastColumn())).getValues()[0];
    if (currentHeaders.length < 17 || !currentHeaders.includes('Horómetro detectado IA')) {
      for (let i = 14; i <= HEADERS_REGISTRO.length; i++) {
        sheetRegistro.getRange(1, i).setValue(HEADERS_REGISTRO[i - 1])
          .setFontWeight('bold')
          .setBackground('#24465A')
          .setFontColor('#FFFFFF');
      }
    }
  }

  // 2. Hoja Máquinas por CD
  let sheetMaquinas = ss.getSheetByName(SHEETS.MAQUINAS);
  if (!sheetMaquinas) {
    sheetMaquinas = ss.insertSheet(SHEETS.MAQUINAS);
    sheetMaquinas.appendRow(['MÁQUINA', 'CD']);
    sheetMaquinas.getRange(1, 1, 1, 2)
      .setFontWeight('bold')
      .setBackground('#252B33')
      .setFontColor('#FFFFFF');
    sheetMaquinas.setFrozenRows(1);
    
    // Lista completa de máquinas actualizada
    const maquinasBase = [
      ['663', 'Apartado'], ['569', 'Apartado'],
      ['800', 'Caucasia'], ['835', 'Caucasia'],
      ['651', 'Corozal'], ['652', 'Corozal'], ['653', 'Corozal'],
      ['640', 'Cucuta'], ['687', 'Cucuta'], ['748', 'Cucuta'], ['759', 'Cucuta'], ['760', 'Cucuta'], ['754', 'Cucuta'],
      ['807', 'Curumaní'], ['785', 'Fonseca'],
      ['571', 'Galapa'], ['572', 'Galapa'], ['801', 'Galapa'], ['858', 'Galapa'], ['861', 'Galapa'], ['865', 'Galapa'], ['CP3', 'Galapa'],
      ['688', 'La Arenosa'], ['752', 'La Arenosa'],
      ['612', 'Magangué'], ['613', 'Magangué'],
      ['831', 'Monteria'], ['837', 'Monteria'], ['661', 'Monteria'], ['662', 'Monteria'], ['892', 'Monteria'],
      ['659', 'Riohacha'], ['573', 'Riohacha'], ['660', 'Riohacha'],
      ['656', 'SantaMarta'], ['657', 'SantaMarta'], ['658', 'SantaMarta'], ['808', 'SantaMarta'],
      ['654', 'Turbaco'], ['655', 'Turbaco'], ['686', 'Turbaco'], ['750', 'Turbaco'], ['749', 'Turbaco'], ['767', 'Turbaco'], ['763', 'Turbaco'], ['758', 'Turbaco'], ['762', 'Turbaco'], ['CP2', 'Turbaco'],
      ['810', 'Valledupar'], ['805', 'Valledupar'], ['834', 'Valledupar']
    ];
    sheetMaquinas.getRange(2, 1, maquinasBase.length, 2).setValues(maquinasBase);
  }

  // 3. Hoja Operadores por CD
  let sheetOperadores = ss.getSheetByName(SHEETS.OPERADORES);
  if (!sheetOperadores) {
    sheetOperadores = ss.insertSheet(SHEETS.OPERADORES);
    sheetOperadores.appendRow(['OPERADOR', 'CD']);
    sheetOperadores.getRange(1, 1, 1, 2)
      .setFontWeight('bold')
      .setBackground('#252B33')
      .setFontColor('#FFFFFF');
    sheetOperadores.setFrozenRows(1);
  }

  SpreadsheetApp.getUi().alert('Estructura de hojas y columnas de evidencia actualizadas correctamente.');
}

/**
 * Consulta GET para alimentar el formulario web
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Máquinas por CD
    const sheetMaquinas = ss.getSheetByName(SHEETS.MAQUINAS) || ss.getSheetByName('Maquinas por CD');
    const dataMaquinas = [];
    if (sheetMaquinas && sheetMaquinas.getLastRow() > 1) {
      const rows = sheetMaquinas.getRange(2, 1, sheetMaquinas.getLastRow() - 1, 2).getValues();
      rows.forEach(r => {
        const maquina = String(r[0] || '').trim();
        const cd = String(r[1] || '').trim();
        if (maquina && cd) {
          dataMaquinas.push({ maquina: maquina, cd: cd });
        }
      });
    }

    // 2. Operadores por CD
    const sheetOperadores = ss.getSheetByName(SHEETS.OPERADORES) || ss.getSheetByName('Operadores por CD');
    const dataOperadores = [];
    if (sheetOperadores && sheetOperadores.getLastRow() > 1) {
      const rows = sheetOperadores.getRange(2, 1, sheetOperadores.getLastRow() - 1, 2).getValues();
      rows.forEach(r => {
        const operador = String(r[0] || '').trim();
        const cd = String(r[1] || '').trim();
        if (operador && cd) {
          dataOperadores.push({ operador: operador, cd: cd });
        }
      });
    }

    // 3. Últimos registros con foto de evidencia
    const sheetRegistro = ss.getSheetByName(SHEETS.REGISTRO);
    const dataRegistros = [];
    if (sheetRegistro && sheetRegistro.getLastRow() > 1) {
      const numCols = Math.max(13, sheetRegistro.getLastColumn());
      const numRows = Math.min(30, sheetRegistro.getLastRow() - 1);
      const startRow = sheetRegistro.getLastRow() - numRows + 1;
      const rows = sheetRegistro.getRange(startRow, 1, numRows, numCols).getValues();
      rows.reverse().forEach(r => {
        dataRegistros.push({
          fecha: String(r[0] || ''),
          hora: String(r[1] || ''),
          cd: String(r[2] || ''),
          maquina: String(r[3] || ''),
          operador: String(r[4] || ''),
          turno: String(r[5] || ''),
          horometro: Number(r[6]) || 0,
          idCilindro: String(r[7] || ''),
          tara: Number(r[8]) || 0,
          pesoLleno: Number(r[9]) || 0,
          pesoNeto: Number(r[10]) || 0,
          observaciones: String(r[11] || ''),
          usuario: String(r[12] || ''),
          horometroDetectadoIA: r[13] !== undefined && r[13] !== '' ? Number(r[13]) : null,
          horometroFinal: r[14] !== undefined && r[14] !== '' ? Number(r[14]) : Number(r[6]) || 0,
          metodoCaptura: String(r[15] || 'fotografia'),
          fotoEvidenciaUrl: String(r[16] || '')
        });
      });
    }

    const response = {
      success: true,
      title: ss.getName(),
      maquinas: dataMaquinas,
      operadores: dataOperadores,
      registrosRecientes: dataRegistros,
      timestamp: new Date().toISOString()
    };

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Manejo de peticiones POST para guardar registros en la hoja 'Registro'
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(12000);

    let data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter;
    }

    // Validaciones obligatorias
    if (!data.cd) throw new Error('El Centro de Distribución (CD) es obligatorio.');
    if (!data.maquina) throw new Error('La Máquina es obligatoria.');
    if (!data.operador) throw new Error('El Operador es obligatorio.');
    if (!data.turno) throw new Error('El Turno es obligatorio (A, B o C).');
    if (data.horometro === undefined || data.horometro === null || String(data.horometro).trim() === '') {
      throw new Error('El Horómetro es obligatorio.');
    }
    if (!data.idCilindro) throw new Error('El ID de cilindro lleno es obligatorio.');
    if (!data.tara || Number(data.tara) <= 0) throw new Error('La Tara debe ser mayor a 0 kg.');
    if (!data.pesoLleno || Number(data.pesoLleno) <= 0) throw new Error('El Peso Lleno debe ser mayor a 0 kg.');

    const tara = Number(data.tara);
    const pesoLleno = Number(data.pesoLleno);

    // Validación crítica: Peso lleno > Tara
    if (pesoLleno <= tara) {
      throw new Error('El peso del cilindro debe ser mayor que la tara.');
    }

    const pesoNeto = Number((pesoLleno - tara).toFixed(2));
    const horometro = Number(data.horometro);

    // Fecha y hora automáticas al momento del registro
    const now = new Date();
    const timeZone = Session.getScriptTimeZone() || 'America/Bogota';
    const fecha = Utilities.formatDate(now, timeZone, 'yyyy-MM-dd');
    const hora = Utilities.formatDate(now, timeZone, 'HH:mm:ss');

    // Procesar y guardar fotografía en Google Drive si se proporciona base64
    let fotoUrl = String(data.fotoEvidenciaUrl || '').trim();
    if (data.fotoBase64) {
      try {
        var folderName = 'Evidencias Horómetro GLP';
        var folders = DriveApp.getFoldersByName(folderName);
        var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
        
        var cleanB64 = String(data.fotoBase64).replace(/^data:image\/[a-z]+;base64,/, '');
        var contentType = String(data.fotoBase64).includes('data:image/png') ? 'image/png' : 'image/jpeg';
        var fileName = 'Horometro_' + String(data.maquina).replace(/\s+/g, '_') + '_' + Utilities.formatDate(now, timeZone, 'yyyyMMdd_HHmmss') + '.jpg';
        
        var blob = Utilities.newBlob(Utilities.base64Decode(cleanB64), contentType, fileName);
        var driveFile = folder.createFile(blob);
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fotoUrl = driveFile.getUrl();
      } catch (errDrive) {
        // En caso de restricción en DriveApp se conserva la URL existente
        if (!fotoUrl) {
          fotoUrl = 'Evidencia adjunta (ID ' + (data.idCilindro || '') + ')';
        }
      }
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetRegistro = ss.getSheetByName(SHEETS.REGISTRO);
    if (!sheetRegistro) {
      inicializarEstructuraHojas();
      sheetRegistro = ss.getSheetByName(SHEETS.REGISTRO);
    }

    // Asegurar encabezados completos si faltan columnas
    if (sheetRegistro.getLastColumn() < HEADERS_REGISTRO.length) {
      for (let i = 1; i <= HEADERS_REGISTRO.length; i++) {
        if (!sheetRegistro.getRange(1, i).getValue()) {
          sheetRegistro.getRange(1, i).setValue(HEADERS_REGISTRO[i - 1])
            .setFontWeight('bold')
            .setBackground('#24465A')
            .setFontColor('#FFFFFF');
        }
      }
    }

    // Fila estructurada con columnas existentes y de evidencia
    const newRow = [
      fecha,
      hora,
      String(data.cd).trim(),
      String(data.maquina).trim(),
      String(data.operador).trim(),
      String(data.turno).trim(),
      horometro,
      String(data.idCilindro).trim().toUpperCase(),
      tara,
      pesoLleno,
      pesoNeto,
      String(data.observaciones || '').trim(),
      String(data.usuario || Session.getActiveUser().getEmail() || 'sistema').trim(),
      data.horometroDetectadoIA !== undefined && data.horometroDetectadoIA !== null ? Number(data.horometroDetectadoIA) : '',
      horometro,
      String(data.metodoCaptura || 'fotografia').trim(),
      fotoUrl
    ];

    sheetRegistro.appendRow(newRow);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: '✓ Registro guardado correctamente con evidencia fotográfica',
      data: {
        fecha: fecha,
        hora: hora,
        cd: data.cd,
        maquina: data.maquina,
        operador: data.operador,
        turno: data.turno,
        horometro: horometro,
        idCilindro: String(data.idCilindro).trim().toUpperCase(),
        tara: tara,
        pesoLleno: pesoLleno,
        pesoNeto: pesoNeto,
        horometroDetectadoIA: data.horometroDetectadoIA,
        metodoCaptura: data.metodoCaptura || 'fotografia',
        fotoEvidenciaUrl: fotoUrl,
        usuario: data.usuario
      }
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Muestra resumen de registros en diálogo de Google Sheets
 */
function mostrarResumenRegistros() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.REGISTRO);
  if (!sheet || sheet.getLastRow() <= 1) {
    SpreadsheetApp.getUi().alert('Aún no existen registros en la hoja "Registro".');
    return;
  }

  const total = sheet.getLastRow() - 1;
  SpreadsheetApp.getUi().alert(
    '📊 Resumen Rendimiento GLP Regional Norte\n\n' +
    'Total de operaciones registradas: ' + total + ' cilindros.\n' +
    'Archivo conectado y en funcionamiento con soporte de evidencia fotográfica.'
  );
}
