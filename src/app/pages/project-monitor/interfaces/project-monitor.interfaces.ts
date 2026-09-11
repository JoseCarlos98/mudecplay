export type ProjectMonitorStatus =
  | 'green'
  | 'yellow'
  | 'red'
  | 'neutral';


export interface ProjectMonitorMetric {
  amount: number;

  percent:
    number |
    null;
}


export interface ProjectMonitorStatusMetric
  extends ProjectMonitorMetric {

  status:
    ProjectMonitorStatus;
}


export interface ProjectMonitorInvestedMetric
  extends ProjectMonitorMetric {

  overBudget:
    boolean;
}


export interface ProjectMonitorTrafficLightItem {
  count:
    number;

  percent:
    number;
}


export interface ProjectMonitorTrafficLight {
  green:
    ProjectMonitorTrafficLightItem;

  yellow:
    ProjectMonitorTrafficLightItem;

  red:
    ProjectMonitorTrafficLightItem;

  neutral:
    ProjectMonitorTrafficLightItem;
}


export interface ProjectMonitorActiveProjects {
  count:
    number;

  percent:
    number;

  withAmountCount:
    number;

  withoutAmountCount:
    number;
}


export interface ProjectMonitorProject {
  projectId:
    number;

  projectName:
    string;

  hasProjectAmount:
    boolean;

  totalProject:
    ProjectMonitorMetric;

  invoiced:
    ProjectMonitorMetric;

  collected:
    ProjectMonitorMetric;

  invested:
    ProjectMonitorInvestedMetric;

  availableFlow:
    ProjectMonitorStatusMetric;

  accountsReceivable:
    ProjectMonitorMetric;

  estimatedProfit:
    ProjectMonitorStatusMetric;
}


export interface ProjectMonitorTotals {
  totalProject:
    ProjectMonitorMetric;

  invoiced:
    ProjectMonitorMetric;

  collected:
    ProjectMonitorMetric;

  invested:
    ProjectMonitorMetric;

  availableFlow:
    ProjectMonitorMetric;

  accountsReceivable:
    ProjectMonitorMetric;

  estimatedProfit:
    ProjectMonitorMetric;
}


export interface ProjectMonitorResponse {
  generatedAt:
    string;

  activeProjects:
    ProjectMonitorActiveProjects;

  availableFlowTrafficLight:
    ProjectMonitorTrafficLight;

  estimatedProfitTrafficLight:
    ProjectMonitorTrafficLight;

  projects:
    ProjectMonitorProject[];

  totals:
    ProjectMonitorTotals;
}