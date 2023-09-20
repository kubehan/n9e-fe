import React, { useState, useEffect, useRef } from 'react';
import { Tree, Segmented, Modal, Button } from 'antd';
import _ from 'lodash';
import type { DraggableData, DraggableEvent } from 'react-draggable';
import Draggable from 'react-draggable';
import { DatasourceCateEnum } from '@/utils/constant';
import { getDatabases, getTables, getColumns } from '../../services';
import './style.less';

interface Props {
  datasourceValue: number;
}

interface DataNode {
  title: string;
  key: string;
  children?: DataNode[];
}

const updateTreeData = (list: DataNode[], key: React.Key, children: DataNode[]): DataNode[] => {
  return _.map(list, (node) => {
    if (node.key === key) {
      return {
        ...node,
        children,
      };
    }
    if (node.children) {
      return {
        ...node,
        children: updateTreeData(node.children, key, children),
      };
    }
    return node;
  });
};

export default function Meta(props: Props) {
  const { datasourceValue } = props;
  const [isStable, setIsStable] = useState<boolean>(false); // 是否是超级表
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const baseParams = {
    cate: DatasourceCateEnum.tdengine,
    datasource_id: datasourceValue,
  };

  const onLoadData = ({ key, children, pos, paranetKey }: any) => {
    return new Promise<void>((resolve) => {
      if (children) {
        resolve();
        return;
      }
      if (_.split(pos, '-')?.length === 2) {
        getTables({
          ...baseParams,
          db: key,
          is_stable: isStable,
        }).then((res) => {
          setTreeData((origin) =>
            updateTreeData(
              origin,
              key,
              _.map(res, (item) => {
                return {
                  title: item,
                  key: `${key}.${item}`,
                  paranetKey: key,
                };
              }),
            ),
          );
          resolve();
          return;
        });
      } else if (_.split(pos, '-')?.length === 3) {
        getColumns({
          ...baseParams,
          db: key.split('.')[0],
          table: key.split('.')[1],
        }).then((res) => {
          setTreeData((origin) =>
            updateTreeData(
              origin,
              key,
              _.map(res, (item) => {
                return {
                  title: `${item.name} (${item.type})`,
                  key: `${key}.${item.name}`,
                  isLeaf: true,
                };
              }),
            ),
          );
          resolve();
          return;
        });
      }
    });
  };

  useEffect(() => {
    getDatabases(baseParams).then((res) => {
      const databases = _.map(res, (item) => ({
        title: item,
        key: item,
      }));
      setTreeData(databases);
    });
  }, [isStable]);

  return (
    <div className='tdengine-discover-meta-content'>
      <Segmented
        block
        options={[
          {
            label: '普通表',
            value: 'table',
          },
          {
            label: '超级表',
            value: 'stable',
          },
        ]}
        value={isStable ? 'stable' : 'table'}
        onChange={(value) => {
          setIsStable(value === 'stable');
        }}
      />
      <div className='tdengine-discover-meta-tree'>
        <Tree
          blockNode
          key={isStable ? 'stable' : 'table'}
          loadData={onLoadData}
          treeData={treeData}
          showLine={{
            showLeafIcon: false,
          }}
        />
      </div>
    </div>
  );
}

export function MetaModal(props: Props) {
  const { datasourceValue } = props;
  const [open, setOpen] = useState(false);
  const [disabled, setDisabled] = useState(true);
  const [bounds, setBounds] = useState({ left: 0, top: 0, bottom: 0, right: 0 });
  const draggleRef = useRef<HTMLDivElement>(null);
  const onStart = (_event: DraggableEvent, uiData: DraggableData) => {
    const { clientWidth, clientHeight } = window.document.documentElement;
    const targetRect = draggleRef.current?.getBoundingClientRect();
    if (!targetRect) {
      return;
    }
    setBounds({
      left: -targetRect.left + uiData.x,
      right: clientWidth - (targetRect.right - uiData.x),
      top: -targetRect.top + uiData.y,
      bottom: clientHeight - (targetRect.bottom - uiData.y),
    });
  };

  return (
    <>
      <Modal
        width={400}
        wrapClassName='tdengine-discover-meta-modal'
        bodyStyle={{
          padding: 10,
          height: 500,
        }}
        mask={false}
        maskClosable={false}
        destroyOnClose
        title={
          <div
            className='tdengine-discover-meta-modal-title'
            style={{
              width: '100%',
              cursor: 'move',
            }}
            onMouseOver={() => {
              if (disabled) {
                setDisabled(false);
              }
            }}
            onMouseOut={() => {
              setDisabled(true);
            }}
            // fix eslintjsx-a11y/mouse-events-have-key-events
            // https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/master/docs/rules/mouse-events-have-key-events.md
            onFocus={() => {}}
            onBlur={() => {}}
            // end
          >
            元信息
          </div>
        }
        visible={open}
        onCancel={() => {
          setOpen(false);
        }}
        footer={null}
        modalRender={(modal) => (
          <Draggable disabled={disabled} bounds={bounds} onStart={(event, uiData) => onStart(event, uiData)}>
            <div ref={draggleRef}>{modal}</div>
          </Draggable>
        )}
      >
        <Meta datasourceValue={datasourceValue} />
      </Modal>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        元信息
      </Button>
    </>
  );
}
