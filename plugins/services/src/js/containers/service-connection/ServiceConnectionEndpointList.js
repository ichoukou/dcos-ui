import React from "react";
import { routerShape } from "react-router";

import ConfigurationMap from "#SRC/js/components/ConfigurationMap";
import ConfigurationMapHeading
  from "#SRC/js/components/ConfigurationMapHeading";
import ConfigurationMapLabel from "#SRC/js/components/ConfigurationMapLabel";
import ConfigurationMapRow from "#SRC/js/components/ConfigurationMapRow";
import ConfigurationMapSection
  from "#SRC/js/components/ConfigurationMapSection";
import ConfigurationMapValue from "#SRC/js/components/ConfigurationMapValue";

import EndpointClipboardTrigger from "./EndpointClipboardTrigger";
import ServiceNoEndpointsPanel from "./ServiceNoEndpointsPanel";
import Service from "../../structs/Service";
import ServiceConfigUtil from "../../utils/ServiceConfigUtil";
import { getDisplayValue } from "../../utils/ServiceConfigDisplayUtil";

const METHODS_TO_BIND = ["handleOpenEditConfigurationModal"];

class ServiceConnectionEndpointList extends React.Component {
  constructor() {
    super(...arguments);

    METHODS_TO_BIND.forEach(method => {
      this[method] = this[method].bind(this);
    });
  }

  handleOpenEditConfigurationModal() {
    const { router } = this.context;
    router.push(
      `/services/detail/${encodeURIComponent(this.props.service.getId())}/edit/`
    );
  }

  getClipboardTrigger(command) {
    return <EndpointClipboardTrigger command={command} />;
  }

  getProtocolValue(portDefinition) {
    const protocol = portDefinition.protocol || "";
    let protocolDisplayValue = "";

    if (Array.isArray(protocol)) {
      protocolDisplayValue = protocol.join(", ");
    }
    protocolDisplayValue = protocolDisplayValue.replace(/,\s*/g, ", ");

    if (protocolDisplayValue !== "") {
      return this.getClipboardTrigger(getDisplayValue(protocolDisplayValue));
    }

    return getDisplayValue(protocolDisplayValue);
  }

  getHostPortValue(portDefinition, service) {
    if (!service.requirePorts) {
      return <span>Auto Assigned</span>;
    }

    let hostPortValue = portDefinition.hostPort;

    if (!hostPortValue) {
      hostPortValue = portDefinition.port;
    }

    if (hostPortValue) {
      return this.getClipboardTrigger(getDisplayValue(hostPortValue));
    }

    return getDisplayValue(hostPortValue);
  }

  getLoadBalancedAddressValue(portDefinition) {
    const { port, labels } = portDefinition;
    const vipLabel = ServiceConfigUtil.findVIPLabel(labels);

    if (vipLabel) {
      return this.getClipboardTrigger(
        ServiceConfigUtil.buildHostNameFromVipLabel(labels[vipLabel], port)
      );
    }

    return <em>Not Enabled</em>;
  }

  getContainerPortValue(portDefinition) {
    const portValue = portDefinition.containerPort;

    if (portValue) {
      return this.getClipboardTrigger(getDisplayValue(portValue));
    }

    return getDisplayValue(portValue);
  }

  getServicePortValue(portDefinition) {
    if (portDefinition.servicePort) {
      return this.getClipboardTrigger(
        getDisplayValue(portDefinition.servicePort)
      );
    }

    return getDisplayValue(portDefinition.servicePort);
  }

  getPortDefinitionDetails(portDefinition, service) {
    return (
      <div>
        <ConfigurationMapRow key="protocol">
          <ConfigurationMapLabel>
            Protocol
          </ConfigurationMapLabel>
          <ConfigurationMapValue>
            {this.getProtocolValue(portDefinition)}
          </ConfigurationMapValue>
        </ConfigurationMapRow>
        <ConfigurationMapRow key="container-port">
          <ConfigurationMapLabel>
            Container Port
          </ConfigurationMapLabel>
          <ConfigurationMapValue>
            {this.getContainerPortValue(portDefinition)}
          </ConfigurationMapValue>
        </ConfigurationMapRow>
        <ConfigurationMapRow key="host-port">
          <ConfigurationMapLabel>
            Host Port
          </ConfigurationMapLabel>
          <ConfigurationMapValue>
            {this.getHostPortValue(portDefinition, service)}
          </ConfigurationMapValue>
        </ConfigurationMapRow>
        <ConfigurationMapRow key="service-port">
          <ConfigurationMapLabel>
            Service Port
          </ConfigurationMapLabel>
          <ConfigurationMapValue>
            {this.getServicePortValue(portDefinition)}
          </ConfigurationMapValue>
        </ConfigurationMapRow>
        <ConfigurationMapRow key="load-balanced-address">
          <ConfigurationMapLabel>
            Load Balanced Address
          </ConfigurationMapLabel>
          <ConfigurationMapValue>
            {this.getLoadBalancedAddressValue(portDefinition)}
          </ConfigurationMapValue>
        </ConfigurationMapRow>
      </div>
    );
  }

  getPortDefinitions(endpoints, service) {
    return endpoints.map(portDefinition => {
      return (
        <ConfigurationMapSection key={portDefinition.name}>
          <ConfigurationMapHeading>
            {portDefinition.name}
          </ConfigurationMapHeading>
          {this.getPortDefinitionDetails(portDefinition, service)}
        </ConfigurationMapSection>
      );
    });
  }

  render() {
    const { service } = this.props;
    let endpoints = [];

    if (service.instances && Array.isArray(service.instances)) {
      service.instances.forEach(instance => {
        instance.containers.forEach(container => {
          endpoints = endpoints.concat(container.endpoints);
        });
      });
    }

    if (service.portDefinitions) {
      endpoints = endpoints.concat(service.portDefinitions);
    }

    if (service.container && service.container.portMappings) {
      endpoints = endpoints.concat(service.container.portMappings);
    }

    if (!endpoints || endpoints.length === 0) {
      return (
        <ServiceNoEndpointsPanel
          serviceId={service.getId()}
          onClick={this.handleOpenEditConfigurationModal}
        />
      );
    }

    return (
      <div className="container">
        <ConfigurationMap>
          {this.getPortDefinitions(endpoints, service)}
        </ConfigurationMap>
      </div>
    );
  }
}

ServiceConnectionEndpointList.propTypes = {
  onEditClick: React.PropTypes.func,
  errors: React.PropTypes.array,
  service: React.PropTypes.instanceOf(Service)
};

ServiceConnectionEndpointList.contextTypes = {
  router: routerShape
};

module.exports = ServiceConnectionEndpointList;
