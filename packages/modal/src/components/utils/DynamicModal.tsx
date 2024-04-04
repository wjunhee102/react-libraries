import {
  ReactNode,
  ReactElement,
  isValidElement,
  createContext,
  useContext,
  useMemo,
  Children,
  ButtonHTMLAttributes,
  useCallback,
  MouseEvent,
} from "react";
import ModalManager from "../../services/modalManager";
import { Modal } from "../../components/modal";
import {
  ModalComponentProps,
  ModalConfirmType,
  ModalDispatchOptions,
  ModalCallback,
} from "../../types";

type DynamicModalOptions = Omit<
  ModalDispatchOptions,
  | keyof ModalComponentProps
  | "middleware"
  | "modalKey"
  | "required"
  | "isClose"
  | "payload"
>;

class DynamicModalManager {
  private modalId: number | null = null;
  private isOpen = false;
  private element: ReactElement | null = null;
  private options: DynamicModalOptions = {};

  constructor(private modalManager: ModalManager) {}

  setElement(element: ReactElement) {
    if (isValidElement(element)) {
      this.element = element;
    }

    return this;
  }

  setOptions(options: DynamicModalOptions = {}) {
    const callback: ModalCallback = (...props) => {
      options.callback && options.callback(...props);
      this.isOpen = false;
    };

    this.options = {
      ...options,
      callback,
    };

    return this;
  }

  open() {
    if (this.isOpen || !this.element) {
      return;
    }

    this.isOpen = true;
    this.modalId = this.modalManager.open(this.element, this.options);
  }

  async action(confirm?: ModalConfirmType) {
    if (!this.modalId) {
      return;
    }

    const result = await this.modalManager.action(this.modalId, confirm);

    if (!result) {
      return;
    }

    this.isOpen = false;
    this.modalId = null;

    return;
  }
}

const DynamicModalContext = createContext<DynamicModalManager | null>(null);

function useDynamicModal() {
  const dynamicModalManager = useContext(DynamicModalContext);

  if (!dynamicModalManager) {
    throw Error("useDynamicModal must be used within a DynamicModal");
  }

  return dynamicModalManager;
}

export interface DynamicModalTriggerProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {}

const DynamicModalTrigger = ({
  onClick,
  ...restProps
}: DynamicModalTriggerProps) => {
  const dynamicModalManager = useDynamicModal();

  const openModal = useCallback(
    (event: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) => {
      onClick && onClick(event);
      dynamicModalManager.open();
    },
    [dynamicModalManager, onClick]
  );

  return <button onClick={openModal} {...restProps} />;
};

export interface DynamicModalElementProps {
  children: ReactElement;
}

const DynamicModalElement = ({ children }: DynamicModalElementProps) => {
  const dynamicModalManager = useDynamicModal();

  dynamicModalManager.setElement(children);

  return null;
};

interface DynamicModalProviderProps {
  modalManager: ModalManager;
  options?: DynamicModalOptions;
  children: ReactNode;
}

const DynamicModalProvider = ({
  modalManager,
  options,
  children,
}: DynamicModalProviderProps) => {
  const dynamicModalManager = useMemo(
    () => new DynamicModalManager(modalManager),
    [modalManager]
  );

  dynamicModalManager.setOptions(options);

  return (
    <DynamicModalContext.Provider value={dynamicModalManager}>
      {children}
    </DynamicModalContext.Provider>
  );
};

export interface DynamicModalProps {
  options?: ModalDispatchOptions;
  children: ReactNode;
}

const setDynamicModal = (modalManager: ModalManager) => {
  function DynamicModal({ children, options = {} }: DynamicModalProps) {
    let dynamicElement: ReactElement | null = null;
    let restChildren: ReactNode[] = [];

    Children.forEach(children, (child) => {
      if (isValidElement(child)) {
        if (child.type === DynamicModalElement) {
          dynamicElement = child;

          return;
        }

        restChildren.push(child);
      }
    });

    if (!dynamicElement) {
      return null;
    }

    return (
      <DynamicModalProvider modalManager={modalManager} options={options}>
        {dynamicElement}
        {restChildren}
      </DynamicModalProvider>
    );
  }

  DynamicModal.displayName = "DynamicModal";

  DynamicModal.Trigger = DynamicModalTrigger;
  DynamicModal.Element = DynamicModalElement;
  DynamicModal.Action = Modal.Action;
  DynamicModal.Cotent = Modal.Content;
  DynamicModal.Title = Modal.Title;

  return DynamicModal;
};

DynamicModalTrigger.displayName = "DynamicModal.Trigger";
DynamicModalElement.displayName = "DynamicModal.Element";

export default setDynamicModal;
