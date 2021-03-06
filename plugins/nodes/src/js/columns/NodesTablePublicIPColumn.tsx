import * as React from "react";
import { Tooltip } from "reactjs-components";
import { TextCell } from "@dcos/ui-kit/dist/packages/table";
import { Trans } from "@lingui/macro";

import Node from "#SRC/js/structs/Node";

const NodesTablePublicIpColumn = (item: Node) => {
  const publicIps = item.getPublicIps();
  if (publicIps.length === 0) {
    return (
      <TextCell>
        <Trans>N/A</Trans>
      </TextCell>
    );
  }
  if (publicIps.length === 1) {
    return <TextCell>{publicIps[0]}</TextCell>;
  }
  return (
    <TextCell>
      <Tooltip content={publicIps.join(", ")}>{publicIps[0]}</Tooltip>
    </TextCell>
  );
};

export { NodesTablePublicIpColumn as default };
