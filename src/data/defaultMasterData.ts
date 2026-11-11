import { MachineRecord, OperatorRecord } from '../types';

// Updated dataset matching the exact machines provided in the user specification
export const DEFAULT_MACHINES: MachineRecord[] = [
  // Apartado
  { maquina: '663', cd: 'Apartado' },
  { maquina: '569', cd: 'Apartado' },
  
  // Caucasia
  { maquina: '800', cd: 'Caucasia' },
  { maquina: '835', cd: 'Caucasia' },
  
  // Corozal
  { maquina: '651', cd: 'Corozal' },
  { maquina: '652', cd: 'Corozal' },
  { maquina: '653', cd: 'Corozal' },
  
  // Cucuta
  { maquina: '640', cd: 'Cucuta' },
  { maquina: '687', cd: 'Cucuta' },
  { maquina: '748', cd: 'Cucuta' },
  { maquina: '759', cd: 'Cucuta' },
  { maquina: '760', cd: 'Cucuta' },
  { maquina: '754', cd: 'Cucuta' },
  
  // Curumaní
  { maquina: '807', cd: 'Curumaní' },
  
  // Fonseca
  { maquina: '785', cd: 'Fonseca' },
  
  // Galapa
  { maquina: '571', cd: 'Galapa' },
  { maquina: '572', cd: 'Galapa' },
  { maquina: '801', cd: 'Galapa' },
  { maquina: '858', cd: 'Galapa' },
  { maquina: '861', cd: 'Galapa' },
  { maquina: '865', cd: 'Galapa' },
  { maquina: 'CP3', cd: 'Galapa' },
  
  // La Arenosa
  { maquina: '688', cd: 'La Arenosa' },
  { maquina: '752', cd: 'La Arenosa' },
  
  // Magangué
  { maquina: '612', cd: 'Magangué' },
  { maquina: '613', cd: 'Magangué' },
  
  // Monteria
  { maquina: '831', cd: 'Monteria' },
  { maquina: '837', cd: 'Monteria' },
  { maquina: '661', cd: 'Monteria' },
  { maquina: '662', cd: 'Monteria' },
  { maquina: '892', cd: 'Monteria' },
  
  // Riohacha
  { maquina: '659', cd: 'Riohacha' },
  { maquina: '573', cd: 'Riohacha' },
  { maquina: '660', cd: 'Riohacha' },
  
  // Santa Marta
  { maquina: '656', cd: 'SantaMarta' },
  { maquina: '657', cd: 'SantaMarta' },
  { maquina: '658', cd: 'SantaMarta' },
  { maquina: '808', cd: 'SantaMarta' },
  
  // Turbaco
  { maquina: '654', cd: 'Turbaco' },
  { maquina: '655', cd: 'Turbaco' },
  { maquina: '686', cd: 'Turbaco' },
  { maquina: '750', cd: 'Turbaco' },
  { maquina: '749', cd: 'Turbaco' },
  { maquina: '767', cd: 'Turbaco' },
  { maquina: '763', cd: 'Turbaco' },
  { maquina: '758', cd: 'Turbaco' },
  { maquina: '762', cd: 'Turbaco' },
  { maquina: 'CP2', cd: 'Turbaco' },
  
  // Valledupar
  { maquina: '810', cd: 'Valledupar' },
  { maquina: '805', cd: 'Valledupar' },
  { maquina: '834', cd: 'Valledupar' },
];

export const DEFAULT_OPERATORS: OperatorRecord[] = [
  // Galapa
  { operador: 'Carlos Rodriguez', cd: 'Galapa' },
  { operador: 'Javier Mendoza', cd: 'Galapa' },
  { operador: 'Luis Fernando Martinez', cd: 'Galapa' },
  { operador: 'Andrés Camilo Castro', cd: 'Galapa' },
  { operador: 'Jorge Mario Pinedo', cd: 'Galapa' },
  
  // Apartado
  { operador: 'Manuel Antonio Guerra', cd: 'Apartado' },
  { operador: 'Ever Morales', cd: 'Apartado' },
  
  // Caucasia
  { operador: 'Hernan Dario Ruiz', cd: 'Caucasia' },
  { operador: 'Nelson Enrique Mejia', cd: 'Caucasia' },
  
  // Corozal
  { operador: 'Jose David Salcedo', cd: 'Corozal' },
  { operador: 'Guillermo Andres Perez', cd: 'Corozal' },
  
  // Cucuta
  { operador: 'Fabian Alveiro Gomez', cd: 'Cucuta' },
  { operador: 'Oscar Eduardo Blanco', cd: 'Cucuta' },
  { operador: 'Wilson Ramirez', cd: 'Cucuta' },
  
  // Curumaní
  { operador: 'Operador Curumaní 1', cd: 'Curumaní' },
  
  // Fonseca
  { operador: 'Operador Fonseca 1', cd: 'Fonseca' },
  
  // La Arenosa
  { operador: 'ANDERSON ARTURO HERNANDEZ ZAMBRANO', cd: 'La Arenosa' },
  { operador: 'DANNYS ALBERTO MONTERO GUERRERO', cd: 'La Arenosa' },
  { operador: 'JHON JAIRO MERCADO', cd: 'La Arenosa' },
  { operador: 'JOSE JAVIER MARIOTA', cd: 'La Arenosa' },
  { operador: 'KEYNER ALEXANDER SUAREZ MELGAREJO', cd: 'La Arenosa' },
  { operador: 'LUIS DAVID CASTILLO MENDEZ', cd: 'La Arenosa' },
  { operador: 'LUIS FERRER', cd: 'La Arenosa' },
  { operador: 'OSCAR JAVIER MAZO ZAMBRANO', cd: 'La Arenosa' },
  { operador: 'ROBERT JOSE VILCHEZ BULASCO', cd: 'La Arenosa' },
  { operador: 'YESHIT ANTONIO SEGRERA LACERA', cd: 'La Arenosa' },
  
  // Magangué
  { operador: 'Operador Magangué 1', cd: 'Magangué' },
  { operador: 'Operador Magangué 2', cd: 'Magangué' },
  
  // Monteria
  { operador: 'Alvaro Jose Cordero', cd: 'Monteria' },
  { operador: 'Deivis Manuel Hernandez', cd: 'Monteria' },
  { operador: 'Ramiro Antonio Hoyos', cd: 'Monteria' },
  { operador: 'JAVIER ANTONIO DIAZ MAESTRA', cd: 'Monteria' },
  { operador: 'JESUS DAVID CASTILLO', cd: 'Monteria' },
  { operador: 'JORGE LUIS BALLESTEROS', cd: 'Monteria' },
  { operador: 'JOSE GREGORIO BARRERA', cd: 'Monteria' },
  { operador: 'RAFAEL SANTI HERNANDEZ', cd: 'Monteria' },
  { operador: 'RAUL ROJAS CELY', cd: 'Monteria' },
  { operador: 'SAMIR PEÑA MONTIEL', cd: 'Monteria' },
  { operador: 'WILSON WARNES MORALES', cd: 'Monteria' },
  
  // Riohacha
  { operador: 'Geovanny Pinto', cd: 'Riohacha' },
  { operador: 'Ender Jose Ibarra', cd: 'Riohacha' },
  { operador: 'Juan Andrades', cd: 'Riohacha' },
  { operador: 'Keivin Soto', cd: 'Riohacha' },
  { operador: 'Luis Peralta', cd: 'Riohacha' },
  
  // Santa Marta
  { operador: 'Operador Santa Marta 1', cd: 'SantaMarta' },
  { operador: 'Operador Santa Marta 2', cd: 'SantaMarta' },
  
  // Turbaco
  { operador: 'Dairo Jose Barrios', cd: 'Turbaco' },
  { operador: 'Edwin Rafael Cueto', cd: 'Turbaco' },
  { operador: 'Mario Alfonso Diaz', cd: 'Turbaco' },
  { operador: 'Rafael Antonio Pautt', cd: 'Turbaco' },
  { operador: 'GARCIA COGOLLO GERMAN GUSTAVO', cd: 'Turbaco' },
  { operador: 'GUZMAN KNOBLICH JOSE DAVID', cd: 'Turbaco' },
  { operador: 'IBAÑEZ BOHORQUEZ JHON LUIS', cd: 'Turbaco' },
  { operador: 'MENA MERCADO JOSE MANUEL', cd: 'Turbaco' },
  { operador: 'MENDOZA MONTENEGRO ESTIVISON', cd: 'Turbaco' },
  { operador: 'MIRANDA CANTILLO JEISER WILFRIDO', cd: 'Turbaco' },
  { operador: 'ORTIZ ALVAREZ RAFAEL ENRIQUE', cd: 'Turbaco' },
  { operador: 'PATERMINA DELGADO IVAN ENRIQUE', cd: 'Turbaco' },
  { operador: 'PERTUZ ANGULO REAL ANDRES', cd: 'Turbaco' },
  { operador: 'QUIÑONES BARONE LUIS ALFONSO', cd: 'Turbaco' },
  { operador: 'ROCHA DUEÑAS DANIEL JOSE', cd: 'Turbaco' },
  { operador: 'ROMERO HURTADO RAFAEL', cd: 'Turbaco' },
  { operador: 'SANJUAN PEÑA YEISON YAIR', cd: 'Turbaco' },
  { operador: 'SARABIA ARNEDO NILSON ENRIQUE', cd: 'Turbaco' },
  
  // Valledupar
  { operador: 'Operador Valledupar 1', cd: 'Valledupar' },
  { operador: 'Operador Valledupar 2', cd: 'Valledupar' },
];
