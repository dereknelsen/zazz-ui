/**
 * @fileoverview The bundled server entry: `dist/server.cjs`, started by the
 * client over IPC.
 */

import { startServer } from "@zazz-ui/language-server/server";

startServer();
