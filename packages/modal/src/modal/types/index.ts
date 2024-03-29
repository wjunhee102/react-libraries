import {
  ModalStateManager,
  ModalLifecycleState,
  ModalState,
  StateController,
  ModalConfirmType,
  ModalCallback,
} from "../services/modalStateManager";

export interface ModalListenerProps {
  modalFiberStack: ModalFiber<ModalOptions>[];
  transactionState: ModalTransactionState;
}

export type ModalListener = (listenerProps: ModalListenerProps) => void;

export type DefaultModalName = "clear" | "unknown";

export type ModalRemovedName = DefaultModalName | string | string[];

export interface ModalTransition {
  transitionProperty: string;
  transitionDuration: string;
  transitionTimingFunction: string;
  transitionDelay: string;
}

export type ModalTransitionProps = {
  [key in keyof ModalTransition]?: ModalTransition[key];
};

export type DefaultModalPosition =
  | "default"
  | "backCover"
  | "bottom"
  | "top"
  | "left"
  | "right"
  | "center"
  | "leftTop"
  | "leftBottom"
  | "rightTop"
  | "rightBottom";

export interface PositionStyle {
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
  transform?: string;
  opacity?: number;
  background?: string;
}

export type ModalPositionStyle = {
  [key in ModalLifecycleState]: PositionStyle;
};

export type ModalPositionTable<T extends string = string> = {
  [key in DefaultModalPosition | T]: ModalPositionStyle;
};

export type ModalPositionMap<T extends string = string> = Map<
  T | DefaultModalPosition,
  ModalPositionStyle
>;

export type ModalTransitionOptions = Omit<
  ModalTransitionProps,
  "transitionDuration"
>;

export interface ModalManagerOptionsProps<T extends string> {
  position?: ModalPositionTable<T>;
  transition?: ModalTransitionOptions;
  duration?: number;
  backCoverColor?: string;
  backCoverOpacity?: number;
}

export type ModalTransactionState = "idle" | "standby" | "active";

export type ModalAsyncCall<T = any, P = any> = (
  asyncCallback: (props: P) => T,
  asyncCallbackProps: P
) => Promise<T>;

export interface ModalMiddlewareProps {
  transactionState: ModalTransactionState;
  standbyTransaction: () => void;
  startTransaction: () => void;
  endTransaction: () => void;
  stateController: StateController;
}

export type ModalMiddleware = (
  props: ModalMiddlewareProps
) => void | Promise<void>;

export interface ModalDispatchOptions<T = any> {
  callback?: ModalCallback;
  middleware?: ModalMiddleware;
  backCoverConfirm?: ModalConfirmType;
  backCoverColor?: string;
  backCoverOpacity?: number;
  title?: React.ReactNode;
  subTitle?: React.ReactNode;
  content?: React.ReactNode;
  subContent?: React.ReactNode;
  confirmContent?: React.ReactNode;
  cancelContent?: React.ReactNode;
  subBtnContent?: React.ReactNode;
  payload?: T;
  closeDelay?: number;
  duration?: number;
  transitionOptions?: ModalTransitionOptions;
  position?:
  | ((breakPoint: number) => DefaultModalPosition | string)
  | DefaultModalPosition
  | string;
  required?: boolean;
}

export interface EditModalOptionsProps<T = any>
  extends ModalDispatchOptions<T> {
  isClose?: boolean;
}

export type ModalClose = (
  callback?: (confirm?: ModalConfirmType) => void,
  confirm?: ModalConfirmType
) => void;

export interface ModalOptions<T = any> extends EditModalOptionsProps<T> {
  closeModal: ModalClose;
  middleware: ModalMiddleware;
  stateManager: ModalStateManager;
}

export type CloseModalProps =
  | ModalRemovedName
  | number
  | [number, ModalRemovedName];

export type CloseModal = (closeModalProps: CloseModalProps) => void;

export interface ModalComponentProps<T = any>
  extends Omit<ModalOptions<T>, "callback" | "closeModal" | "middleware">,
  ModalState {
  transactionState: ModalTransactionState;
  action: (confirm?: ModalConfirmType) => void;
  stateController: StateController;
}

export type ModalComponent<T = any> = React.FC<ModalComponentProps<T>>;

export interface ModalComponentFiber {
  name: string;
  component: ModalComponent;
  defaultOptions?: ModalDispatchOptions;
}

export interface ModalFiber<T extends ModalDispatchOptions = ModalOptions> {
  id: number;
  name: string;
  component: ModalComponent<any>;
  options: T;
}
