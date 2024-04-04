import {
  DEFAULT_DURATION,
  DEFAULT_POSITION,
  DEFAULT_TRANSITION,
  MODAL_LIFECYCLE_STATE,
  RESERVED_MODAL_NAME,
  MODAL_POSITION,
  MODAL_TRANSACTION_STATE,
} from "../contants";
import {
  ModalListener,
  ModalComponentSeed,
  ModalSeed,
  ModalOptions,
  ModalRemovedName,
  ModalDispatchOptions,
  CloseModalProps,
  EditModalOptionsProps,
  ModalPositionMap,
  ModalPositionTable,
  ModalTransition,
  ModalManagerOptionsProps,
  ModalTransitionProps,
  ModalPositionStyle,
  ModalTransitionOptions,
  ModalTransactionState,
  ModalManagerState,
  ModalLifecycleState,
  ModalComponent,
} from "../types";
import { ModalManagerInterface } from "../types/modalInterfaces";
import { isReservedModalName } from "../utils/isReservedModalName";
import { defaultMiddleware } from "../utils/defaultMiddleware";
import { getCloseModal } from "../utils/getCloseModal";
import { getPositionKey } from "../utils/getPositionKey";
import { Modal } from "./modal";

class ModalManager<T extends ModalPositionTable = ModalPositionTable>
  implements ModalManagerInterface
{
  private currentId: number = 0;
  private transactionState: ModalTransactionState =
    MODAL_TRANSACTION_STATE.idle;
  private modalStack: Modal[] = [];
  private listeners: ModalListener[] = [];
  private modalComponentSeedMap: Map<string, ModalComponentSeed> = new Map();
  private modalPositionMap: ModalPositionMap = new Map();
  private modalTransition: ModalTransition = DEFAULT_TRANSITION;
  private modalDuration: number = DEFAULT_DURATION;
  private stateResponsiveComponent: boolean = false;
  private breakPoint: number = 0;
  private modalManagerState!: ModalManagerState;

  constructor(
    baseModalComponentSeed: ModalComponentSeed[] = [],
    options: ModalManagerOptionsProps<T> = {}
  ) {
    if (!this.modalComponentSeedMap) {
      this.modalComponentSeedMap = new Map();
    }

    this.bind();

    baseModalComponentSeed.forEach(this.setModalComponentSeedMap);
    this.initModalOptions(options);
    this.setModalManagerState();
  }

  /* 초기화 및 설정 관련 메소드 */

  private bind() {
    this.setModalComponentSeedMap = this.setModalComponentSeedMap.bind(this);

    this.executeAsync = this.executeAsync.bind(this);
    this.open = this.open.bind(this);
    this.remove = this.remove.bind(this);
    this.edit = this.edit.bind(this);
    this.close = this.close.bind(this);

    this.getModalComponentSeed = this.getModalComponentSeed.bind(this);
    this.getCurrentModalPosition = this.getCurrentModalPosition.bind(this);
    this.getTransactionState = this.getTransactionState.bind(this);
    this.stanbyTransaction = this.stanbyTransaction.bind(this);
    this.startTransaction = this.startTransaction.bind(this);
    this.endTransaction = this.endTransaction.bind(this);
  }

  initModalOptions(optionsProps: ModalManagerOptionsProps<T>) {
    const { position, transition, duration, stateResponsiveComponent } =
      optionsProps;

    const initialPosition: ModalPositionTable = {
      ...DEFAULT_POSITION,
      ...position,
    };

    this.stateResponsiveComponent = stateResponsiveComponent || false;
    this.setModalPosition(initialPosition);
    this.setModalTransition(transition);
    this.setModalDuration(duration);
  }

  private setModalManagerState() {
    this.modalManagerState = {
      modalStack: this.modalStack,
      transactionState: this.transactionState,
      isOpen: this.modalStack.length > 0 ? true : false,
      breakPoint: this.breakPoint,
    };
  }

  /* 모달 컴포넌트 관리 */

  private setModalComponentSeedMap(componentSeed: ModalComponentSeed) {
    const { name, component, defaultOptions } = componentSeed;

    if (component === undefined || isReservedModalName(name)) {
      return;
    }

    const currentModalComponentSeed = this.modalComponentSeedMap.get(name);

    if (
      currentModalComponentSeed &&
      currentModalComponentSeed.defaultOptions?.required
    ) {
      return;
    }

    const modalComponentSeed = {
      ...componentSeed,
      defaultOptions: {
        ...defaultOptions,
        duration: defaultOptions?.duration || this.modalDuration,
      },
    };

    this.modalComponentSeedMap.set(name, modalComponentSeed);
  }

  setModalComponent(componentSeed: ModalComponentSeed | ModalComponentSeed[]) {
    if (Array.isArray(componentSeed)) {
      componentSeed.forEach(this.setModalComponentSeedMap);
    } else {
      this.setModalComponentSeedMap(componentSeed);
    }

    return this;
  }

  removeModalComponent(name: string | string[]) {
    if (Array.isArray(name)) {
      name.forEach((n) => {
        this.modalComponentSeedMap.delete(n);
      });

      this.modalStack = this.modalStack.filter(
        (modal) => !name.includes(modal.name)
      );
    } else {
      this.modalComponentSeedMap.delete(name);

      this.modalStack = this.modalStack.filter((modal) => modal.name !== name);
    }

    return this;
  }

  getModalComponentSeed(name: string) {
    return this.modalComponentSeedMap.get(name);
  }

  /* 모달 인스턴스 관리 */

  private createModal(modalSeed: ModalSeed<ModalDispatchOptions>): Modal {
    const { id, options, name, modalKey, component } = modalSeed;

    const closeModal = getCloseModal({
      id,
      duration: options.duration,
      closeModal: this.remove,
      getTransactionState: this.getTransactionState,
      startTransaction: this.startTransaction,
      endTransaction: this.endTransaction,
    });

    const middleware = options.middleware
      ? options.middleware
      : defaultMiddleware;

    const mergedOptions: ModalOptions<any> = {
      stateResponsiveComponent: this.stateResponsiveComponent,
      ...options,
      callback: options.callback,
      closeModal,
      middleware,
    };

    return new Modal(
      {
        id,
        name,
        modalKey,
        component,
        options: mergedOptions,
      },
      this
    );
  }

  filterModalByName(name: string | string[]) {
    if (Array.isArray(name)) {
      this.modalStack = this.modalStack.filter(
        (modal) => !name.includes(modal.name)
      );
    } else {
      this.modalStack = this.modalStack.filter((modal) => modal.name !== name);
    }

    return this;
  }

  pushModal(
    modalSeed:
      | ModalSeed<ModalDispatchOptions>
      | ModalSeed<ModalDispatchOptions>[]
  ) {
    let newModalStack: Modal[];

    if (Array.isArray(modalSeed)) {
      newModalStack = modalSeed.map((seed) => this.createModal(seed));
    } else {
      newModalStack = [this.createModal(modalSeed)];
    }

    this.modalStack = [...this.modalStack, ...newModalStack];

    this.notify();
  }

  popModal(removedName?: ModalRemovedName) {
    if (this.modalStack.length === 0) {
      this.currentId = 0;
      return this;
    }

    if (removedName === undefined) {
      this.modalStack = this.modalStack.slice(0, -1);

      return this;
    }

    if (removedName === RESERVED_MODAL_NAME.clear) {
      this.clearModalStack();

      return this;
    }

    this.filterModalByName(removedName);

    return this;
  }

  clearModalStack() {
    this.modalStack = [];
    this.currentId = 0;

    return this;
  }

  getCurrentModalId() {
    if (this.modalStack.length === 0) {
      return 0;
    }

    return this.modalStack[this.modalStack.length - 1].id;
  }

  /* 모달 transition, position 관리 */

  setModalTransition(transitionProps?: ModalTransitionProps) {
    if (transitionProps === undefined) {
      return this;
    }

    const transition = {
      ...this.modalTransition,
      ...transitionProps,
    };

    this.modalTransition = transition;

    return this;
  }

  setModalDuration(duration: number = -1) {
    if (duration < 0) {
      return this;
    }

    this.modalDuration = duration;
    this.setModalTransition({ transitionDuration: `${duration}ms` });

    return this;
  }

  setModalPosition(modalPositionTable: ModalPositionTable) {
    const modalPositionList = Object.entries(modalPositionTable);

    modalPositionList.forEach(([key, value]) => {
      this.modalPositionMap.set(key, value);
    });

    return this;
  }

  setModalOptions<P extends ModalPositionTable = ModalPositionTable>(
    optionsProps: ModalManagerOptionsProps<T & P>
  ) {
    const { position, transition, duration, stateResponsiveComponent } =
      optionsProps;

    this.setModalTransition(transition);
    this.setModalDuration(duration);

    if (stateResponsiveComponent) {
      this.stateResponsiveComponent = stateResponsiveComponent;
    }

    if (position) {
      this.setModalPosition(position);
    }
  }

  getModalTransition(
    duration: number = -1,
    options: ModalTransitionOptions = {}
  ): ModalTransition {
    if (duration < 0) {
      return {
        ...this.modalTransition,
        ...options,
      };
    }

    const transitionDuration = `${duration}ms`;

    return {
      ...this.modalTransition,
      transitionDuration,
      ...options,
    };
  }

  getModalPosition(key: string = MODAL_POSITION.center): ModalPositionStyle {
    const position = this.modalPositionMap.get(key);

    if (!position) {
      const center = this.modalPositionMap.get(MODAL_POSITION.center);

      return center ?? DEFAULT_POSITION.center;
    }

    return position;
  }

  getModalPositionMap() {
    return this.modalPositionMap;
  }

  getCurrentModalPosition(
    positionState: ModalLifecycleState,
    position: string = MODAL_POSITION.center
  ) {
    let state: ModalLifecycleState = positionState;
    let key: string = position;

    const positionKey = getPositionKey(position, state);

    if (Array.isArray(positionKey)) {
      state = positionKey[0];
      key = positionKey[1];
    } else {
      key = positionKey;
    }

    const {
      open: defaultInitial,
      active: defaultActive,
      close: defautFinal,
    } = this.getModalPosition(MODAL_POSITION.default);

    const { open, active, close } = this.getModalPosition(key);

    if (state === MODAL_LIFECYCLE_STATE.open) {
      return {
        ...defaultInitial,
        ...open,
      };
    }

    if (state === MODAL_LIFECYCLE_STATE.active) {
      return {
        ...defaultActive,
        ...active,
      };
    }

    return {
      ...defautFinal,
      ...close,
    };
  }

  /* 트랜잭션 관리 */

  setTransactionState(transactionState: ModalTransactionState) {
    this.transactionState = transactionState;
    this.notify();

    return transactionState;
  }

  stanbyTransaction() {
    return this.setTransactionState(MODAL_TRANSACTION_STATE.standby);
  }

  startTransaction() {
    return this.setTransactionState(MODAL_TRANSACTION_STATE.active);
  }

  endTransaction() {
    return this.setTransactionState(MODAL_TRANSACTION_STATE.idle);
  }

  getTransactionState() {
    return this.transactionState;
  }

  async executeAsync<F = any, P = any>(
    asyncCallback: (props: P) => Promise<F>,
    asyncCallbackProps: P
  ) {
    if (typeof asyncCallback !== "function") {
      throw new Error("modalManager.ts line 482: not function");
    }

    this.startTransaction();

    try {
      const data = await asyncCallback(asyncCallbackProps);

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }

      if (typeof error === "string") {
        throw new Error(error);
      }

      throw new Error("modalManager.ts line 500: not error");
    } finally {
      this.endTransaction();
    }
  }

  /* 상태 및 이벤트 리스너 관리 */

  subscribe(listener: ModalListener) {
    this.listeners.push(listener);

    return this;
  }

  unsubscribe(listener: ModalListener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  notify() {
    this.setModalManagerState();

    this.listeners.forEach((listener) => listener(this.modalManagerState));
  }

  getState(): ModalManagerState {
    return this.modalManagerState;
  }

  getModalStack() {
    return this.modalStack;
  }

  /* 모달 액션 관련 */

  action(targetModalId: number, confirm?: boolean | string) {
    const targetModal = this.modalStack.filter(
      (modal) => targetModalId === modal.id
    )[0];

    if (!targetModal) {
      return;
    }

    targetModal.action(confirm);

    this.notify();

    return;
  }

  /**
   * @param name
   * @param options
   * @returns 현재 등록된 모달의 id를 반환합니다. 만약 등록되지 않은 모달이라면 0을 반환합니다.
   */
  open<P = any>(
    name: string | ModalComponent,
    options: ModalDispatchOptions<P, Extract<keyof T, string>> = {}
  ) {
    const modalKey = options.modalKey || null;

    if (modalKey) {
      const findedModal = this.modalStack.find(
        (modal) => modal.modalKey === modalKey
      );

      if (findedModal) {
        return 0;
      }
    }

    if (typeof name === "string") {
      const componentSeed = this.getModalComponentSeed(name);

      if (componentSeed === undefined) {
        return 0;
      }

      const { component, defaultOptions } = componentSeed;

      this.currentId += 1;

      const modalSeed: ModalSeed<ModalDispatchOptions<P>> = {
        id: this.currentId,
        modalKey,
        name,
        component,
        options: {
          ...defaultOptions,
          ...options,
        },
      };

      this.pushModal(modalSeed);

      return this.currentId;
    }

    if (typeof name !== "function") {
      return 0;
    }

    this.currentId += 1;

    this.pushModal({
      id: this.currentId,
      modalKey,
      name: "unknown",
      component: name,
      options,
    });

    return this.currentId;
  }

  /**
   * @param removedName
   * @returns 마지막으로 등록된 모달의 id를 반환합니다. 만약 등록된 모달이 없다면 0을 반환합니다.
   */
  remove(removedName?: CloseModalProps) {
    if (typeof removedName === "number") {
      this.modalStack = this.modalStack.filter(
        (modal) => modal.id !== removedName
      );
      this.notify();

      return this.getCurrentModalId();
    }

    if (Array.isArray(removedName)) {
      this.modalStack = this.modalStack.filter(
        (modal) => modal.id !== removedName[0]
      );

      this.popModal(removedName[1]);

      return this.getCurrentModalId();
    }

    this.popModal(removedName);
    this.notify();

    return this.getCurrentModalId();
  }

  editModalProps<P = any>(
    id: number,
    props: EditModalOptionsProps<P, Extract<keyof T, string>>
  ) {
    let modalId = 0;

    /**
     * modal 수정하는 로직 만들기
     */
    // this.modalStack = this.modalStack.map((modal) => {
    //   if (modal.id !== id) {
    //     return modal;
    //   }

    //   modalId = modal.id;

    //   return { ...modal, options: { ...modal.options, ...props } };
    // });

    this.notify();

    return modalId;
  }

  /**
   *
   * @param id
   * @param props
   */
  edit<P = any>(
    id: number,
    props: EditModalOptionsProps<P, Extract<keyof T, string>>
  ) {
    return this.editModalProps(id, props);
  }

  /**
   * @param id
   * @returns 마지막으로 등록된 모달의 id를 반환합니다. 만약 등록된 모달이 없다면 0을 반환합니다.
   */
  close(id: number) {
    return this.editModalProps(id, { isClose: false });
  }

  setBreakPoint(breakPoint: number) {
    this.breakPoint = breakPoint;
    this.notify();
  }
}

export default ModalManager;
