/**
 * @fileoverview Color identifiers for the border-value check, where the browser
 * asks `CSS.supports("color", value)`: the named colors, the system colors, and
 * the keywords every property accepts.
 */

const NAMED = `aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond
blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk
crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki
darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen
darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue
dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite
gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki
lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan
lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen
lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen
magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen
mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream
mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid
palegoldenrod palegreen paleturquoise palevioletred papayawhip peru pink plum powderblue
purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell
sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal
thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen`;

const SYSTEM = `accentcolor accentcolortext activetext buttonborder buttonface buttontext canvas
canvastext field fieldtext graytext highlight highlighttext linktext mark marktext
selecteditem selecteditemtext visitedtext`;

const KEYWORDS = "currentcolor transparent inherit initial unset revert revert-layer";

const COLORS = new Set(`${NAMED} ${SYSTEM} ${KEYWORDS}`.split(/\s+/));

export function isColor(value: string): boolean {
  return COLORS.has(value.toLowerCase());
}
