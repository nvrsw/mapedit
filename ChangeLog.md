# NVR / VMS Map Editor Change Log #

## Map Editor 1.3.0 (2015-07-08) ##

- 마우스 휠 스크롤 화면 확대 / 마우스 드래그 화면 이동 지원 ([5159]):
  `Shift`키 누른 상태에서 동작
- 확대 상태에서 객체 좌표와 크기 어긋나지 않게 하기 ([5160])
- `Fill` 버튼 / 자동 생성 동작할 때 숫자 부분만 고려하기 ([5161])


## Map Editor 1.2.2 (2015-03-12) ##

- 그룹 크기 변경하면 항목 위치가 조금씩 어긋남 고침 ([5039])


## Map Editor 1.2.1 (2015-03-10) ##

- 아이템의 카메라 방향 편집 기능 추가 ([5053]): `Direction:`에 `방향,범위`를
  각각 `0~359,1~360` 값으로 지정, 둘 중 하나라도 `-1`이면 표시 안함
- 화면 배율이 지도마다 다르게 적용되는 문제 고침 ([5058])


## Map Editor 1.2.0 (2015-03-06) ##

- 배경 이미지가 있으면 마우스 드래그로 선택 안됨 고침 ([5040])
- 종료할 때 저장되지 않은 내용이 있으면 저장할 지 물어보기 ([5041])
- 아이템 이름을 수정하면 `Fill` 버튼 동작 안함 고침 ([5042])
- 메뉴 단축키 추가 ([5046])


## Map Editor 1.1.2 (2014-12-11) ##

- 200% 확대 보기에서 100% 보기 범위 이상으로 아이템이 움직이지 않는 문제 고침
  ([4974])
- 자동으로 한꺼번에 생성된 아이템 크기가 조금씩 다른 현상 고침 ([4975])
- 지도별로 설정한 배경 이미지가 첫번째 지도에 모두 표시되는 문제 고침 ([4978])


## Map Editor 1.1.1 (2014-12-02) ##

- 다른 이름으로 저장하는 기능 추가 ([4963])
- 그룹 선택 상태에서 저장하면 잘못된 좌표가 저장되는 문제 고침


## Map Editor 1.1.0 (2014-11-14) ##

- 맵 에디터 기능 개선 ([4873])

  - 그룹 선택 후 위치 이동 / 크기 조정 / 삭제 기능
  - 그룹 선택 후 가장 큰 자리수에 맞추어 0 채워주는 버튼 추가
  - 키보드 방향 키로 미세 위치 조정
  - 자동 생성할 때 4,9번 포함 / 제외 선택 버튼 추가
  - 자동 생성할 때 오름차순 / 내림차순 선택 버튼 추가
  - 항목 더블 클릭하면 이름 편집 상태로 변경
  - Delete키로 항목 삭제

- 지도 파일(zip) 로딩 속도 개선

- 'Open Recent' 메뉴 제거


[4873]: https://bugs.nvrsw.com/show_bug.cgi?id=4873
[4963]: https://bugs.nvrsw.com/show_bug.cgi?id=4963
[4974]: https://bugs.nvrsw.com/show_bug.cgi?id=4974
[4975]: https://bugs.nvrsw.com/show_bug.cgi?id=4975
[4978]: https://bugs.nvrsw.com/show_bug.cgi?id=4978
[5039]: https://bugs.nvrsw.com/show_bug.cgi?id=5039
[5040]: https://bugs.nvrsw.com/show_bug.cgi?id=5040
[5041]: https://bugs.nvrsw.com/show_bug.cgi?id=5041
[5042]: https://bugs.nvrsw.com/show_bug.cgi?id=5042
[5046]: https://bugs.nvrsw.com/show_bug.cgi?id=5046
[5053]: https://bugs.nvrsw.com/show_bug.cgi?id=5053
[5058]: https://bugs.nvrsw.com/show_bug.cgi?id=5058
[5159]: https://bugs.nvrsw.com/show_bug.cgi?id=5159
[5160]: https://bugs.nvrsw.com/show_bug.cgi?id=5160
[5161]: https://bugs.nvrsw.com/show_bug.cgi?id=5161

