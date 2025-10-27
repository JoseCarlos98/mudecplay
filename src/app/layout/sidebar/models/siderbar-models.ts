
interface Item {
  id: string;
  name: string;
  icon: string;
  route: string;
}

interface Section {
  id: string;
  name: string;
  items: Item[];
}

interface SubModule {
  id: string;
  name: string;
  icon: string;
  sections?: Section[];
}

interface Module {
  id: string;
  name: string;
  icon: string;
  description?: string;
  route?: string;
  subModules?: SubModule[];
}
