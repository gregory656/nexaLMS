import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// IMPORTANT: Requires @supabase/supabase-js to be installed. We'll run this via npx or node.
const supabaseUrl = 'https://xgzdscebuznishsferce.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemRzY2VidXpuaXNoc2ZlcmNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyODc0OTUsImV4cCI6MjA5Nzg2MzQ5NX0.F7TNcAjcpGTUK8632wwKTvZqm4ea3XRYfnQyfIQt44M';
const supabase = createClient(supabaseUrl, supabaseKey);

const email = 'kivaywa@gmail.com';
const password = '999888777Ss.';

// Grade 8 data
const grade8Raw = `| **1** | GEOFREY JOSEPH | 66 | 80 | 78 | 89 | 64 | 68 | 85 | 69 | 60 | 659 |
| **2** | BETHEVER LUMBASI | 78 | 72 | 50 | 67 | 59 | 63 | 90 | 78 | 67 | 624 |
| **3** | BRAMWEL MWOLOLO | 76 | 70 | 60 | 79 | 61 | 50 | 73 | 70 | 69 | 608 |
| **4** | PRAYZOON LICHUNGU | 54 | 70 | 67 | 71 | 51 | 58 | 82 | 77 | 48 | 578 |
| **5** | JOSES SIABONGA | 66 | 72 | 33 | 71 | 60 | 69 | 80 | 72 | 50 | 573 |
| **6** | BARAKA JUMA | 54 | 68 | 42 | 63 | 61 | 53 | 81 | 74 | 55 | 551 |
| **7** | JUSTINE WANJALA | 68 | 76 | 34 | 63 | 54 | 41 | 80 | 63 | 68 | 547 |
| **8** | WISDOM SIMIYU | 40 | 68 | 43 | 63 | 63 | 59 | 83 | 74 | 40 | 533 |
| **9** | WAYNE TSIMONJERO | 66 | 68 | 33 | 53 | 63 | 58 | 72 | 60 | 54 | 527 |
| **10** | BLESSING ANUNDA | 58 | 66 | 34 | 69 | 63 | 51 | 58 | 74 | 47 | 520 |
| **11** | PURITY SIAKIRO | 56 | 68 | 26 | 64 | 50 | 40 | 76 | 67 | 63 | 510 |
| **12** | SEBASTIAN TUNGA | 64 | 68 | 24 | 46 | 45 | 45 | 84 | 75 | 55 | 506 |
| **13** | WAYNE ODUOR | 48 | 64 | 21 | 74 | 54 | 41 | 87 | 57 | 54 | 500 |
| **14** | SAIDA PAMELA | 40 | 70 | 38 | 67 | 50 | 37 | 60 | 50 | 55 | 467 |
| **15** | BRIGHTON WECHULI | 62 | 70 | 23 | 57 | 42 | 46 | 75 | 62 | 22 | 459 |
| **16** | ARNOLD KHAEMBA | 32 | 72 | 30 | 68 | 39 | 35 | 88 | 55 | 39 | 458 |
| **17** | STACY MUTAKALE | 60 | 74 | 28 | 51 | 44 | 53 | 54 | 57 | 33 | 454 |
| **18** | YASIN BENSON | 64 | 66 | 28 | 40 | 38 | 46 | 74 | 53 | 44 | 453 |
| **19** | GRANTON EGODI | 50 | 66 | 37 | 54 | 31 | 41 | 76 | 53 | 45 | 453 |
| **20** | AUGUSTINE WASAI | 60 | 27 | 62 | 69 | 28 | 46 | 75 | 54 | 29 | 450 |
| **21** | MELAB WASENWA | 60 | 70 | 15 | 46 | 40 | 35 | 63 | 71 | 43 | 443 |
| **22** | WHITNEY KAKONJE | 48 | 62 | 26 | 58 | 45 | 39 | 58 | 57 | 36 | 429 |
| **23** | SUSAN LUBISIA | 28 | 58 | 26 | 49 | 40 | 38 | 62 | 67 | 43 | 411 |
| **24** | CLITON WANYAMA | 40 | 23 | 62 | 52 | 36 | 39 | 53 | 62 | 39 | 406 |
| **25** | PRECIOUS VAKHOYA | 44 | 72 | 21 | 37 | 37 | 29 | 67 | 49 | 37 | 393 |
| **26** | BEVALYNE NANJALA | 48 | 64 | 24 | 33 | 30 | 31 | 60 | 59 | 43 | 392 |
| **27** | GIFT AKHASAYA | 46 | 56 | 20 | 51 | 26 | 30 | 60 | 47 | 55 | 391 |
| **28** | MELVIN KHAKALI | 54 | 60 | 22 | 39 | 30 | 35 | 60 | 58 | 32 | 390 |
| **29** | CENTRINE KIRANDE | 44 | 52 | 11 | 51 | 34 | 39 | 63 | 54 | 40 | 388 |
| **30** | JOY ACHIENG | 38 | 56 | 23 | 30 | 34 | 46 | 63 | 60 | 37 | 387 |
| **31** | BRIGHTON SECHERO | 38 | 58 | 17 | 48 | 70 | 29 | 58 | 31 | 32 | 381 |
| **32** | BLESSING KHAYESI | 32 | 46 | 11 | 30 | 63 | 71 | 33 | 29 | 63 | 377 |
| **33** | EUDIAS MUKHWANA | 44 | 43 | 25 | 23 | 64 | 46 | 28 | 40 | 64 | 377 |
| **34** | ABIGAEL NAMASAKA | 38 | 50 | 24 | 36 | 48 | 44 | 29 | 51 | 37 | 357 |
| **35** | MARY WASILWA | 26 | 60 | 37 | 36 | 51 | 58 | 28 | 46 | 40 | 342 |
| **36** | FRANKLINE WAFULA | 22 | 11 | 37 | 30 | 52 | 54 | 43 | 31 | 59 | 339 |
| **37** | VICTORIA SILENJE | 36 | 18 | 29 | 25 | 58 | 50 | 35 | 40 | 46 | 337 |
| **38** | EVANS MUSIKA | 32 | 6 | 37 | 32 | 58 | 52 | 21 | 27 | 72 | 337 |
| **39** | SNAIDAH JUMA | 32 | 16 | 37 | 28 | 53 | 52 | 33 | 38 | 46 | 335 |
| **40** | HAZEL KHAFULULU | 32 | 22 | 48 | 24 | 45 | 40 | 33 | 37 | 44 | 325 |
| **41** | MOWEN NDAYA | 32 | 18 | 30 | 24 | 63 | 45 | 33 | 29 | 46 | 320 |
| **42** | BRAVIN SEMO | 32 | 16 | 37 | 33 | 53 | 40 | 29 | 41 | 39 | 320 |
| **43** | IAN ROMBOSIA | 32 | 16 | 34 | 20 | 58 | 33 | 27 | 42 | 51 | 317 |
| **44** | LAVIN SARAH | 42 | 17 | 47 | 34 | 65 | 50 | 32 | 16 | 9 | 313 |
| **45** | FAITH MASITSA | 32 | NULL | 44 | 35 | 51 | 44 | 22 | 17 | 63 | 308 |
| **46** | DIANA BARASA | 32 | 16 | 44 | 14 | 35 | 56 | 25 | 58 | 24 | 304 |
| **47** | OLIVER WAKHUNGU | 28 | 8 | 46 | 41 | 56 | 34 | 34 | 31 | 26 | 302 |
| **48** | ANNE IMESI | 36 | 18 | 40 | 31 | NULL | 56 | 49 | 43 | 29 | 300 |
| **49** | TIMINA MIRIAM | 34 | 17 | 30 | 17 | 47 | 35 | 24 | 43 | 45 | 292 |
| **50** | EUGINE MBOYA | 34 | 14 | 34 | 19 | 53 | 31 | 27 | 32 | 48 | 290 |
| **51** | ABRAHAM WANJALA | 32 | 12 | 46 | 20 | 53 | 40 | 25 | 37 | 19 | 284 |
| **52** | LARRY NDEGE | 30 | 15 | 48 | 6 | 44 | 35 | 16 | 40 | 48 | 282 |
| **53** | FAVOUR NAKOME | 36 | 18 | 31 | 21 | 46 | 46 | 25 | 35 | 24 | 282 |
| **54** | CATHERINE KHEVALI | 50 | 22 | 39 | 25 | NULL | 44 | 40 | 42 | 18 | 280 |
| **55** | MITCHEL SIMIYU | 32 | 25 | 27 | 12 | 53 | 29 | 33 | 41 | 28 | 280 |
| **56** | DAISY WAFULA | 26 | 24 | 39 | 18 | 60 | 38 | 19 | 33 | 19 | 276 |
| **57** | VALENTINE BEN | 24 | 11 | 37 | 28 | 37 | 30 | 22 | 43 | 44 | 276 |
| **58** | MARION SIMIYU | 28 | 13 | 58 | 50 | 9 | 44 | 13 | 42 | 18 | 275 |
| **59** | PURITY NAFULA | 34 | 28 | 27 | 25 | 48 | 37 | 30 | 11 | 32 | 272 |
| **60** | VALARY NAFULA | 28 | 13 | 32 | 15 | 15 | 27 | 46 | 26 | 64 | 266 |
| **61** | EZRA NALIANYA | 34 | 13 | 49 | 32 | 15 | 25 | 28 | 2 | 63 | 261 |
| **62** | GRAFTON WEKESA | 18 | 22 | 32 | 15 | 25 | 58 | 13 | 28 | 49 | 260 |
| **63** | NESSY MASITSA | 28 | 12 | 27 | 6 | 41 | 37 | 15 | 30 | 64 | 260 |
| **64** | DANIEL MWANZA | 38 | 13 | 26 | 20 | 37 | 37 | 37 | 26 | 25 | 259 |
| **65** | MERCY NAMUKHOSI | 22 | 50 | 14 | 36 | 15 | 21 | 45 | 31 | 17 | 251 |
| **66** | ELIZABETH KHAYESI | 30 | 46 | NULL | 27 | 15 | 15 | 51 | 30 | 30 | 244 |
| **67** | WILSON MAKOKHA | 28 | 66 | 15 | 17 | 18 | 20 | 40 | 22 | 16 | 242 |
| **68** | MARK SAISI | 14 | 40 | 17 | 37 | 15 | 18 | 40 | 24 | 33 | 238 |
| **69** | PRINCESS KAYALA | 22 | 48 | 12 | 35 | 14 | 16 | 43 | 25 | 20 | 235 |
| **70** | MARY MULUPI | 30 | 58 | 15 | 26 | 17 | 29 | 51 | 31 | 27 | 233 |
| **71** | SHALINE MUKHAVI | 24 | 46 | 11 | 26 | 18 | 19 | 41 | 24 | 19 | 228 |
| **72** | MAXIMILLA NAMAROME | 28 | 58 | 16 | 30 | 19 | 10 | 51 | 39 | 33 | 226 |
| **73** | GAD EMMANUEL | 26 | 52 | 7 | 29 | 16 | 8 | 35 | 27 | 16 | 216 |
| **74** | GRACE MALARO | 26 | 48 | 12 | 19 | 15 | 9 | 28 | 40 | 29 | 214 |
| **75** | WILFRED BAHATI | 42 | 64 | 13 | 21 | 17 | NULL | NULL | 33 | 22 | 212 |
| **76** | LAVENDA NGOME | 28 | 40 | 8 | 29 | 10 | 6 | 41 | 14 | 22 | 198 |
| **77** | LOVELY SITUMA | 26 | 58 | 11 | 26 | 14 | NULL | 46 | 22 | 15 | 196 |
| **78** | ELPHAS NALIKA | 20 | 60 | 10 | 19 | 8 | 16 | 30 | 23 | 8 | 194 |
| **79** | BRUCE MOLENJE | 32 | 7 | 54 | 11 | 17 | 19 | 23 | 17 | 3 | 183 |
| **80** | SHERRY AMANI | 38 | 44 | 10 | 27 | 12 | 10 | 36 | 21 | 17 | 171 |
| **81** | CHARITY NALIAKA | 14 | 56 | 9 | 19 | 12 | 10 | 14 | 23 | 12 | 169 |
| **82** | SCHOLASTICA SITUMA | 30 | 44 | 7 | 11 | 10 | 13 | 18 | 19 | 14 | 166 |
| **83** | JOASH KHAEMBA | 32 | 52 | 11 | 23 | 12 | NULL | NULL | 20 | 15 | 165 |
| **84** | EUGENE MBOYI | 32 | 58 | 12 | NULL | 3 | 23 | NULL | NULL | 37 | 165 |
| **85** | MIRIAM MMBONE | 32 | 62 | NULL | 19 | 12 | NULL | NULL | 17 | 19 | 161 |
| **86** | ELIZABETH SHOFA | 24 | 44 | 6 | 16 | 11 | 9 | 20 | 19 | 7 | 156 |
| **87** | JACOB BARASA | 18 | 64 | NULL | 24 | 8 | 1 | NULL | 17 | 18 | 150 |
| **88** | JOHN CHIVILI | 32 | 34 | NULL | 39 | 2 | 20 | 15 | 11 | 16 | 149 |
| **89** | JANE MIKHALWA | 30 | 30 | 15 | 23 | 5 | 10 | 14 | 16 | 5 | 148 |
| **90** | MARK AMANI | 30 | 13 | 28 | 6 | 9 | 11 | 12 | 28 | 4 | 141 |
| **91** | BOAZ NALIANYA | 26 | 30 | 12 | 19 | 8 | 6 | 13 | 21 | 3 | 138 |
| **92** | BRIAN WANJALA | 28 | 58 | NULL | 11 | 6 | NULL | NULL | 16 | 13 | 132 |
| **93** | IVY NAFULA | 26 | 28 | 4 | 21 | 12 | 15 | NULL | 19 | 5 | 124 |
| **94** | LUCKY MAROFA | 34 | 9 | 32 | 9 | 15 | NULL | NULL | 20 | 5 | 120 |
| **95** | PHILIP NYONGESA | 38 | 4 | 30 | 10 | 7 | NULL | NULL | 20 | 11 | 120 |
| **96** | BLESSING KALOMBO | 16 | 53 | 54 | 12 | 8 | NULL | NULL | 17 | 5 | 112 |
| **97** | EUGINE MATASI | 28 | 9 | 3 | 11 | 3 | NULL | NULL | 17 | 4 | 108 |
| **98** | MERCY MIYU | 28 | 9 | NULL | 20 | 12 | 10 | NULL | 15 | 7 | 101 |
| **99** | SHARON INJENDI | 32 | 22 | NULL | 19 | 6 | NULL | 6 | 11 | 8 | 93 |
| **100** | FORTUNE PATRICK | 24 | 32 | NULL | 11 | 6 | NULL | 7 | 11 | 6 | 86 |
| **101** | EZEKIEL NGOME | 28 | 22 | NULL | 10 | 4 | NULL | 11 | 11 | 10 | 85 |
| **102** | REBECCA WAFULA | 20 | 5 | 30 | 10 | 2 | NULL | 11 | NULL | 4 | 82 |
| **103** | CARLOS BARASA | 20 | NULL | 22 | 11 | 2 | NULL | 8 | NULL | NULL | 63 |`;

// Grade 7 Data
const grade7Raw = `| **GODLIVES VUYANZI** | 88 | 94 | 87 | 99 | 90 | 68 | 78 | 81 | 91 | 776 | 1 |
| **BENJAMIN AIDEN** | 86 | 92 | 57 | 82 | 75 | 61 | 70 | 67 | 88 | 678 | 2 |
| **LEILA NAFULA** | 82 | 90 | 64 | 65 | 87 | 56 | 80 | 64 | 83 | 671 | 3 |
| **BERYL WEKESA** | 82 | 84 | 54 | 84 | 88 | 55 | 77 | 60 | 81 | 665 | 4 |
| **LESLIE MUSITA** | 84 | 90 | 47 | 80 | 77 | 50 | 67 | 57 | 79 | 640 | 5 |
| **GABRIEL KAMBITA** | 84 | 88 | 61 | 76 | 81 | 43 | 70 | 66 | 77 | 637 | 6 |
| **IAN ILONDANGA** | 78 | 84 | 58 | 73 | 80 | 49 | 71 | 56 | 75 | 624 | 7 |
| **DARREN SHITOSHE** | 80 | 82 | 60 | 74 | 68 | 39 | 75 | 64 | 74 | 616 | 8 |
| **IAN LUKORITO** | 74 | 84 | 46 | 80 | 81 | 55 | 70 | 54 | 69 | 613 | 9 |
| **ANGEL MARY** | 82 | 86 | 48 | 69 | 80 | 40 | 54 | 52 | 60 | 571 | 10 |
| **JARED WAFULA** | 84 | 88 | 47 | 70 | 68 | 43 | 58 | 50 | 58 | 566 | 11 |
| **EMMANUEL MURAMBI** | 76 | 80 | 33 | 66 | 74 | 48 | 56 | 57 | 70 | 560 | 12 |
| **JACINTA WAVOMBA** | 80 | 86 | 43 | 64 | 70 | 39 | 60 | 49 | 63 | 554 | 13 |
| **CARREN MATHIAS** | 72 | 82 | 36 | 74 | 66 | 38 | 70 | 56 | 39 | 533 | 14 |
| **EMMANUEL SHIKUKU** | 72 | 92 | 38 | 73 | 68 | 38 | 62 | 44 | 46 | 533 | 15 |
| **SURPRISE NASAMBU** | 70 | 92 | 51 | 56 | 67 | 29 | 60 | 54 | 52 | 531 | 16 |
| **KAYLINE SITUMA** | 80 | 94 | 36 | 71 | 56 | 38 | 44 | 58 | 54 | 531 | 17 |
| **FLAVIAN WEKESA** | 76 | 92 | 37 | 56 | 53 | 31 | 55 | 51 | 68 | 519 | 18 |
| **PRECIOUS KAGONYA** | 78 | 84 | 50 | 49 | 67 | 30 | 60 | 37 | 46 | 501 | 19 |
| **MISPER SHATSILA** | 72 | 90 | 44 | 63 | 43 | 34 | 60 | 41 | 48 | 495 | 20 |
| **RHODA KEYA** | 74 | 80 | 13 | 63 | 67 | 36 | 47 | 57 | 68 | 492 | 21 |
| **SHARLINE RABBECA** | 64 | 78 | 28 | 60 | 64 | 25 | 58 | 40 | 60 | 477 | 22 |
| **AUDREY HOPE** | 80 | 90 | 23 | 67 | 55 | 31 | 51 | 31 | 40 | 468 | 23 |
| **NEDDY KHAKASA** | 64 | 86 | 65 | 41 | 62 | 20 | 54 | 23 | 50 | 465 | 24 |
| **TREVIOUS WANYAMA** | 68 | 90 | 23 | 56 | 46 | 26 | 50 | 57 | 40 | 456 | 25 |
| **HYDARUS SHARRIF** | 80 | 86 | 33 | 64 | 54 | 26 | 56 | 49 | 37 | 452 | 26 |
| **DAMARIS WANJALA** | 72 | 94 | 24 | 58 | 43 | 28 | 47 | 41 | 44 | 451 | 27 |
| **SHANICE INGOSI** | 66 | 86 | 29 | 49 | 62 | 26 | 50 | 47 | 63 | 449 | 28 |
| **RASOA KEYA** | 68 | 82 | 27 | 53 | 65 | 19 | 50 | 33 | 40 | 437 | 29 |
| **PRECIOUS MERCY** | 64 | 92 | 12 | 56 | 48 | 28 | 60 | 35 | 34 | 429 | 30 |
| **ISAIAH SHIMANGA** | 76 | 88 | 18 | 49 | 38 | 29 | 42 | 44 | 41 | 425 | 31 |
| **CAPRIAN NAMASAKA** | 56 | 78 | 16 | 52 | 51 | 29 | 60 | 41 | 40 | 423 | 32 |
| **JOAN ANYULA** | 62 | 90 | 29 | 61 | 24 | 29 | 40 | 46 | 30 | 413 | 33 |
| **PURITY MAFUMBO** | 56 | 84 | 35 | 46 | 58 | 25 | 42 | 36 | 32 | 412 | 34 |
| **CHARLES MASIKA** | 66 | 78 | 20 | 47 | 39 | 21 | 48 | 40 | 37 | 396 | 35 |
| **REAGAN MULIMI** | 60 | 90 | 25 | 46 | 41 | 31 | 32 | 27 | 41 | 393 | 36 |
| **PRAISE WAMBULWA** | 72 | 88 | 15 | 59 | 37 | 23 | 41 | 32 | 23 | 390 | 37 |
| **GLANCY MASENGELI** | 60 | 90 | 21 | 50 | 35 | 25 | 30 | 34 | 37 | 382 | 38 |
| **ABIGAEL NYONGESA** | 60 | 94 | 27 | 61 | 50 | 33 | 56 | 36 | 24 | 380 | 39 |
| **LEVI WAFULA** | 54 | 92 | 20 | 29 | 41 | 24 | 38 | 30 | 21 | 349 | 40 |
| **JOHN SHAMALA** | 74 | 84 | 20 | 51 | 43 | 34 | 43 | 44 | 26 | 345 | 41 |
| **LINDAH INJENDI** | 50 | 92 | 29 | 39 | 37 | 21 | 36 | 19 | 18 | 345 | 42 |
| **MIDEVA WEKESA** | 72 | 84 | 29 | 40 | 42 | 16 | 39 | 19 | 43 | 344 | 43 |
| **TRIZAH SALOME** | 52 | 88 | 18 | 46 | 47 | 23 | 45 | 29 | 25 | 336 | 44 |
| **MOSES WANYONYI** | 52 | 86 | 15 | 48 | 25 | 11 | 48 | 17 | 20 | 332 | 45 |
| **BELVIN NYIKURI** | 48 | 82 | 22 | 40 | 34 | 14 | 48 | 16 | 14 | 326 | 46 |
| **ANGELA OLESI** | 44 | 86 | 18 | 47 | 39 | 26 | 45 | 27 | 15 | 317 | 47 |
| **JUNIOR MIKE** | 64 | 84 | 16 | 49 | 16 | 9 | 44 | 21 | 23 | 310 | 48 |
| **SHANTEL NADIA** | 45 | 86 | 16 | 31 | 47 | 15 | 30 | 23 | 12 | 307 | 49 |
| **EMILY WEBUYE** | 48 | 74 | 14 | 29 | 27 | 14 | 33 | 26 | 17 | 294 | 50 |
| **MUS AMBANI** | 52 | 80 | 12 | 40 | 10 | 19 | 40 | 14 | 16 | 290 | 51 |
| **CAREN INJENDI** | 38 | 88 | 23 | 44 | 19 | 11 | 31 | 24 | 10 | 283 | 52 |
| **CYNTHIA VIGINIA** | 30 | 84 | 8 | 29 | 29 | 15 | 39 | 14 | 8 | 279 | 53 |
| **MERCY NASICHE** | 58 | 78 | 31 | 37 | 27 | — | 30 | 16 | 17 | 276 | 54 |
| **ROSE NAMALWA** | 38 | 80 | 31 | 34 | 23 | 18 | 31 | 19 | 16 | 274 | 55 |
| **KELVIN THOMAS** | 52 | 82 | 24 | 40 | 30 | 14 | 22 | 32 | 20 | 274 | 56 |
| **HOPE OMONDI** | 38 | 78 | 10 | 33 | 4 | 15 | — | — | 24 | 268 | 57 |
| **JAYDEN CHIMALEN** | 42 | 82 | 20 | 37 | 26 | 8 | 37 | 31 | 12 | 263 | 58 |
| **CENTRINE WAMALWA** | 40 | 72 | 10 | 17 | 12 | 14 | 41 | 21 | 15 | 261 | 59 |
| **BOAZ MUSA** | 58 | 48 | 20 | 34 | 17 | 13 | 27 | 21 | 7 | 250 | 60 |
| **MOSES WEKESA** | 46 | 78 | 12 | 41 | 24 | 10 | 32 | 17 | 17 | 243 | 61 |
| **RACHEAL WAMALWA** | 32 | 62 | 19 | 33 | 17 | 16 | 30 | 21 | 7 | 234 | 62 |
| **LAURA NGOME** | 36 | 72 | 17 | 24 | 12 | 15 | — | 17 | — | 228 | 63 |
| **ANGEL MASITSA** | 24 | 82 | 9 | 33 | 9 | 11 | 22 | 27 | 5 | 228 | 64 |
| **AGRIPINNA BARASA** | 46 | 66 | 9 | 33 | — | — | 11 | — | — | — | 65 |
| **ELIZABETH KHAKALI** | 24 | 64 | 14 | 31 | 13 | 8 | 30 | 20 | 5 | 209 | 66 |
| **FAITH SIMIYU** | 42 | 78 | 11 | 25 | 8 | 9 | 27 | 19 | 17 | 208 | 67 |
| **SHADRACK SUNGUTI** | 30 | 90 | 18 | 32 | 13 | 5 | 31 | 11 | 8 | 200 | 68 |
| **ESTHER NANJALA** | 32 | 62 | 18 | 19 | 7 | 13 | 17 | 11 | 9 | 199 | 69 |
| **SAFANIA WERE** | 32 | 54 | 25 | 19 | 7 | 10 | 20 | 16 | 6 | 192 | 70 |
| **CLINTON BARASA** | 42 | 54 | 9 | 19 | 6 | 14 | 21 | 14 | 6 | 181 | 71 |
| **BRIGHTON BARASA** | 20 | 56 | 13 | 21 | 9 | 10 | 20 | 19 | 2 | 169 | 72 |
| **ROBINSON WANGILA** | 30 | 38 | 18 | 23 | 4 | 11 | 16 | 14 | 9 | 167 | 73 |
| **BRUCE KENNEDY** | 32 | 30 | 13 | 40 | 5 | 6 | 17 | 14 | 7 | 167 | 74 |
| **MIRIAM JOHN** | 28 | 56 | 17 | 29 | 8 | 9 | 17 | 17 | 5 | 166 | 75 |
| **ROSE WANYONYI** | 28 | 30 | 11 | 20 | 13 | 19 | 22 | 10 | 15 | 150 | 76 |
| **MORIS SIMIYU** | 38 | 70 | 15 | — | — | 8 | — | 11 | — | 150 | 77 |
| **FRANCIS MARANI** | 18 | 38 | 11 | 19 | 12 | 8 | — | 10 | 5 | 143 | 78 |
| **GETRAY BARASA** | 36 | 44 | 24 | 17 | 11 | 13 | — | 6 | 9 | 130 | 79 |
| **EMMANUEL WANDABWA** | 28 | 44 | — | 24 | 8 | 8 | — | — | 11 | 129 | 80 |
| **BELINDA MASITSA** | 42 | 64 | 86 | 40 | 33 | 15 | 36 | 10 | 25 | 126 | 81 |
| **MARK SIMIYU** | — | — | — | 14 | 6 | 9 | 14 | 10 | 6 | 123 | 82 |
| **ELISHA MUKONYI** | — | 70 | — | 19 | 7 | 5 | — | 20 | 5 | 122 | 83 |
| **TRIZAH OBERIAN** | 36 | 40 | — | 16 | 3 | 4 | — | 10 | 8 | 121 | 84 |
| **CHRISTABEL KHAIDO** | — | 52 | — | 18 | 9 | 14 | — | 19 | 8 | 120 | 85 |
| **LINCON WANJALA** | — | 62 | — | 17 | 5 | 10 | — | 11 | 8 | 113 | 86 |
| **JOHN MANYASI** | 20 | 24 | 10 | 10 | 8 | 5 | 12 | 11 | 7 | 107 | 87 |
| **ALEXANDER BARASA** | — | 30 | — | 21 | 6 | 18 | 30 | 24 | 16 | 93 | 88 |
| **KELVIN** | — | — | — | — | — | — | — | — | — | 88 | 89 |`;

async function seedMarks() {
    try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError) throw authError;
        console.log('Logged in successfully!');

        const schoolId = authData.user.user_metadata?.school_id || authData.user?.school_id;

        let actualSchoolId = schoolId;
        if (!actualSchoolId) {
            const { data: userRecord } = await supabase.from('users').select('school_id').eq('id', authData.user.id).single();
            actualSchoolId = userRecord?.school_id;
        }
        console.log('School ID:', actualSchoolId);

        // Fetch required data
        const [
            { data: classes },
            { data: subjects },
            { data: students },
            { data: exams },
            { data: gradeScales },
            { data: terms },
            { data: academicYears },
            { data: examTypes }
        ] = await Promise.all([
            supabase.from('classes').select('id, name, stream_id').eq('school_id', actualSchoolId),
            supabase.from('subjects').select('id, name').eq('school_id', actualSchoolId),
            supabase.from('students').select('id, first_name, last_name, class_id').eq('school_id', actualSchoolId),
            supabase.from('exams').select('id, name, term_id, academic_year_id').eq('school_id', actualSchoolId),
            supabase.from('grade_scales').select('*').eq('school_id', actualSchoolId),
            supabase.from('terms').select('*').eq('school_id', actualSchoolId),
            supabase.from('academic_years').select('*').eq('school_id', actualSchoolId),
            supabase.from('exam_types').select('*').eq('school_id', actualSchoolId),
        ]);

        console.log(`Found ${classes?.length} classes`);
        console.log(`Found ${subjects?.length} subjects`);
        console.log(`Found ${students?.length} students`);

        // Find Class IDs
        const grade7ClassIds = classes.filter(c => c.name.toLowerCase().includes('grade 7')).map(c => c.id);
        const grade8ClassIds = classes.filter(c => c.name.toLowerCase().includes('grade 8')).map(c => c.id);

        if (!grade7ClassIds.length || !grade8ClassIds.length) {
            console.error('Could not find Grade 7 or Grade 8 classes.');
            return;
        }

        // We will default to the N/A stream or the first found class object.
        const grade7ClassId = classes.find(c => c.name.toLowerCase() === 'grade 7 n/a')?.id || grade7ClassIds[0];
        const grade8ClassId = classes.find(c => c.name.toLowerCase() === 'grade 8 n/a')?.id || grade8ClassIds[0];

        // Subject Mapping
        const getSubId = (keyword) => subjects.find(s => s.name.toLowerCase().includes(keyword.toLowerCase()))?.id;

        const engId = getSubId('eng') || getSubId('english');
        const kiswId = getSubId('kisw') || getSubId('kiswahili');
        const mathId = getSubId('math');
        const intsId = getSubId('int') || getSubId('science') || getSubId('integrated');
        const creId = getSubId('cre') || getSubId('christian');
        const pretId = getSubId('pre-tech') || getSubId('pre tech') || getSubId('pret');
        const casId = getSubId('cas') || getSubId('creative') || getSubId('arts');
        const agrId = getSubId('agr') || getSubId('agriculture');
        const sstId = getSubId('sst') || getSubId('social');

        if (!engId || !kiswId || !mathId) {
            console.error('Missing core subjects in the database. Ensure subjects are properly named (English, Kiswahili, Mathematics, etc.)');
            console.log('Available Subjects:', subjects.map(s => s.name));
            return;
        }

        const grade7SubjectOrder = [engId, kiswId, mathId, intsId, creId, pretId, casId, agrId, sstId];
        const grade8SubjectOrder = [engId, kiswId, mathId, intsId, creId, pretId, casId, agrId, sstId];

        const getGradePoint = (marks) => {
            if (marks == null || isNaN(marks)) return null;
            for (const gs of gradeScales) {
                if (marks >= gs.min_marks && marks <= gs.max_marks) return gs;
            }
            return null;
        };

        const getAutoComment = (marks, studentName) => {
            const gs = getGradePoint(marks);
            if (!gs) return '';
            if (gs.remarks) return gs.remarks.replace('{student name}', studentName).replace('{student_name}', studentName);
            if (marks >= 80) return `Excellent work, ${studentName}! Keep it up.`;
            if (marks >= 70) return `Good performance, ${studentName}. Aim higher.`;
            if (marks >= 60) return `Fair effort, ${studentName}. More practice needed.`;
            if (marks >= 50) return `Below average, ${studentName}. Must improve.`;
            return `Needs significant improvement, ${studentName}.`;
        };

        // Exam creation (or finding existing Mid Term Exam)
        let examId = exams.find(e => e.name.toLowerCase().includes('mid') || e.name.toLowerCase().includes('term 2'))?.id;

        if (!examId) {
            console.log("No Mid Term exam found, creating one...");
            let termId = terms[0]?.id;
            let academicYearId = academicYears[0]?.id;
            let examTypeId = examTypes[0]?.id;

            // If they are empty for some reason we need to create them but normally there is some setup
            if (!termId || !academicYearId || !examTypeId) {
                console.error("No term, academic year or exam type found.")
                return;
            }

            const { data: newExam, error: examError } = await supabase.from('exams').insert({
                school_id: actualSchoolId,
                name: 'Mid Term Exam - Term 2',
                exam_type_id: examTypeId,
                term_id: termId,
                academic_year_id: academicYearId,
                status: 'published'
            }).select().single();

            if (examError) throw examError;
            examId = newExam.id;
        }

        console.log("Using Exam ID:", examId);

        let resultsToInsert = [];

        const processRows = (rawText, subjectOrder, classId) => {
            const rows = rawText.split('\n').filter(r => r.trim() !== '');
            for (const row of rows) {
                const parts = row.split('|').map(p => p.trim());
                if (parts.length < 12) continue; // Invalid row

                let nameIndex = 1;
                // If the first col is just a number (Grade 8) vs Name (Grade 7)
                if (parts[1].includes('**') && parseInt(parts[1].replace(/\\*\\*/g, ''))) {
                    nameIndex = 2; // G8
                }

                const studentNameFull = parts[nameIndex].replace(/\\*\\*/g, '').trim();
                const studentNameParts = studentNameFull.split(' ');
                const firstName = studentNameParts[0];
                const lastName = studentNameParts.length > 1 ? studentNameParts.slice(1).join(' ') : 'Unknown';

                // Find student by name
                let student = students.find(s =>
                    s.first_name.toLowerCase() === firstName.toLowerCase() &&
                    s.last_name.toLowerCase().includes(studentNameParts[studentNameParts.length - 1].toLowerCase()) &&
                    (s.class_id === classId || grade7ClassIds.includes(s.class_id) || grade8ClassIds.includes(s.class_id))
                );

                if (!student) {
                    console.log(`⚠️ Could not find exact match for student: ${studentNameFull}. Trying approx match or using existing names.`);
                    // Create dummy? Let's just try to find by first name
                    student = students.find(s => s.first_name.toLowerCase() === firstName.toLowerCase() && s.class_id === classId);
                }

                if (!student) {
                    // Let's create the student
                    console.log(`Creating student ${studentNameFull} in Class ${classId}`);
                    // We'll insert it later or just do it real time
                }

                // If we don't have the student in the database, we'll collect their info to create them
                let studentId = student?.id;

                // Assuming students were already manually filled by user "i filled students manually but its tiresome", so we should be able to find them
                // Wait, maybe we just use their first name and last name?
            }
        };

        // Actually let's just make sure all students in the sheets are inserted/found
        let studentsToCreate = [];
        const findStudentMap = {};

        const parseAndMatchStudents = (rawText, classId, isGrade8) => {
            const rows = rawText.split('\n').filter(r => r.trim() !== '');
            for (const row of rows) {
                const parts = row.split('|').map(p => p.trim());
                if (parts.length < 10) continue;

                let nameIndex = isGrade8 ? 2 : 1;

                const studentNameFull = parts[nameIndex].replace(/\\*\\*/g, '').trim();
                const studentNameParts = studentNameFull.split(' ');
                const firstName = studentNameParts[0];
                const lastName = studentNameParts.length > 1 ? studentNameParts.slice(1).join(' ') : firstName;

                let student = students.find(s =>
                (s.first_name.toLowerCase() === firstName.toLowerCase() &&
                    (s.last_name.toLowerCase().includes(studentNameParts[studentNameParts.length - 1].toLowerCase()) || studentNameParts[studentNameParts.length - 1].toLowerCase().includes(s.last_name.toLowerCase())))
                );

                if (!student) {
                    student = students.find(s => s.first_name.toLowerCase() === firstName.toLowerCase());
                }

                if (!student && !studentsToCreate.find(s => s.first_name === firstName && s.last_name === lastName)) {
                    studentsToCreate.push({
                        school_id: actualSchoolId,
                        first_name: firstName,
                        last_name: lastName,
                        class_id: classId,
                        status: 'active'
                    });
                } else if (student) {
                    if (student.class_id !== classId) {
                        // Might need to update class ID
                    }
                }
            }
        };

        parseAndMatchStudents(grade7Raw, grade7ClassId, false);
        parseAndMatchStudents(grade8Raw, grade8ClassId, true);

        if (studentsToCreate.length > 0) {
            console.log(`Creating ${studentsToCreate.length} missing students...`);
            const { data: createdStudents, error: insertError } = await supabase.from('students').insert(studentsToCreate).select('id, first_name, last_name, class_id');
            if (insertError) throw insertError;
            students.push(...createdStudents);
        }

        // Now collect results
        const calculateResults = (rawText, subjectOrder, classId, isGrade8) => {
            const rows = rawText.split('\n').filter(r => r.trim() !== '');
            for (const row of rows) {
                const parts = row.split('|').map(p => p.trim());
                if (parts.length < 10) continue;

                let nameIndex = isGrade8 ? 2 : 1;
                let markStartIndex = nameIndex + 1;

                const studentNameFull = parts[nameIndex].replace(/\\*\\*/g, '').trim();
                const firstName = studentNameFull.split(' ')[0];

                let student = students.find(s => s.first_name.toLowerCase() === firstName.toLowerCase() && s.class_id === classId);
                // Fallback to any class if not found
                if (!student) student = students.find(s => s.first_name.toLowerCase() === firstName.toLowerCase());

                if (student) {
                    for (let i = 0; i < subjectOrder.length; i++) {
                        const subjectId = subjectOrder[i];
                        if (!subjectId) continue;

                        const markStr = parts[markStartIndex + i];
                        if (!markStr) continue;

                        const markStrClean = markStr.replace(/\\*\\*/g, '').trim();
                        if (markStrClean === 'NULL' || markStrClean === '—') continue;

                        const mark = parseFloat(markStrClean);
                        if (!isNaN(mark)) {
                            const gs = getGradePoint(mark);
                            resultsToInsert.push({
                                school_id: actualSchoolId,
                                exam_id: examId,
                                student_id: student.id,
                                subject_id: subjectId,
                                class_id: classId, // Actually use student.class_id but they might not have it right
                                marks: mark,
                                grade: gs?.grade || null,
                                remarks: getAutoComment(mark, student.first_name),
                            });
                        }
                    }
                }
            }
        };

        calculateResults(grade7Raw, grade7SubjectOrder, grade7ClassId, false);
        calculateResults(grade8Raw, grade8SubjectOrder, grade8ClassId, true);

        console.log(`Ready to insert ${resultsToInsert.length} exam results.`);

        // Insert in batches of 50
        for (let i = 0; i < resultsToInsert.length; i += 50) {
            const batch = resultsToInsert.slice(i, i + 50);
            const { error } = await supabase.from('exam_results').upsert(batch, { onConflict: 'exam_id,student_id,subject_id' });
            if (error) {
                console.error('Error inserting results:', error);
            } else {
                console.log(`Successfully inserted batch of ${batch.length} results.`);
            }
        }

    } catch (e) {
        console.error(e);
    }
}

seedMarks();
