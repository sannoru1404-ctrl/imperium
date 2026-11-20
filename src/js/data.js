

// ===================== DATA =====================
export const FACT={
 rome:{n:'Рим',c:'#c0392b',cap:'roma'},
 carth:{n:'Карфаген',c:'#8e44ad',cap:'carthago'},
 gaul:{n:'Галлы',c:'#2e8b3e',cap:'gallia'},
 greek:{n:'Греки',c:'#2a6fc9',cap:'maced'},
 rebel:{n:'Мятежники',c:'#7d7468'}
};
export const UT={
 mil:{n:'Ополчение',i:'🔱',atk:4,def:3,mov:2,rng:1,cost:150},
 sword:{n:'Мечники',rn:'Легионеры',i:'⚔️',atk:7,def:5,mov:2,rng:1,cost:300},
 spear:{n:'Копейщики',rn:'Триарии',i:'🛡️',atk:5,def:7,mov:2,rng:1,cost:350},
 arch:{n:'Лучники',rn:'Сагиттарии',i:'🏹',atk:5,def:2,mov:2,rng:4,cost:300},
 cav:{n:'Конница',rn:'Эквиты',i:'🐎',atk:7,def:4,mov:4,rng:1,cost:500},
 eleph:{n:'Боевые слоны',i:'🐘',atk:10,def:6,mov:3,rng:1,cost:800}
};
export const RECRUIT={rome:['sword','spear','arch','cav'],carth:['sword','spear','arch','cav','eleph'],gaul:['sword','spear','arch','cav'],greek:['sword','spear','arch','cav'],rebel:['mil']};
export function uname(t,f){return (f==='rome'&&UT[t].rn)||UT[t].n}

export const PROV_DEF=[
 ['iberia','Иберия',55,190,'rebel',150],
 ['ncarth','Новый Карфаген',88,240,'carth',180],
 ['narbo','Нарбон',135,140,'gaul',170],
 ['gallia','Галлия',105,70,'gaul',200],
 ['germ','Германия',230,40,'gaul',130],
 ['cisalp','Цизальпина',195,108,'gaul',180],
 ['illyr','Иллирия',282,98,'rebel',140],
 ['roma','Рим',236,168,'rome',260],
 ['capua','Капуя',258,205,'rome',200],
 ['taras','Тарент',290,240,'rebel',190],
 ['syrac','Сиракузы',262,296,'rebel',210],
 ['sard','Сардиния',191,243,'carth',120],
 ['carthago','Карфаген',205,348,'carth',280],
 ['numid','Нумидия',90,362,'carth',140],
 ['cyren','Киренаика',340,400,'rebel',170],
 ['maced','Македония',335,148,'greek',220],
 ['epir','Эпир',315,192,'greek',150],
 ['athen','Афины',350,230,'greek',250]
];
export const ADJ=[['iberia','ncarth'],['iberia','narbo'],['ncarth','numid',1],['narbo','gallia'],['narbo','cisalp'],['narbo','sard',1],
['gallia','germ'],['gallia','cisalp'],['germ','cisalp'],['germ','illyr'],['cisalp','roma'],['cisalp','illyr'],
['roma','capua'],['roma','sard',1],['capua','taras'],['capua','syrac',1],['taras','syrac',1],['taras','epir',1],
['syrac','carthago',1],['sard','carthago',1],['carthago','numid'],['carthago','cyren'],['cyren','athen',1],
['illyr','maced'],['illyr','epir'],['maced','epir'],['maced','athen'],['epir','athen']];
export const START_ARMY={
 roma:['sword','sword','spear','arch','cav'],capua:['sword','arch'],
 carthago:['sword','sword','eleph','cav','arch'],numid:['cav','cav'],ncarth:['sword','spear'],
 gallia:['sword','sword','sword','cav'],cisalp:['sword','sword','arch'],narbo:['spear'],
 maced:['spear','spear','cav','arch'],athen:['spear','arch']
};
export const WIN_N=14;
